"use strict";

const { normalizeValue, isContainerNameValid } = require("./config");
const { runCommand } = require("./command-runner");

const LOG_TYPES = {
  access: "/var/log/nginx/app.access.log",
  error: "/var/log/nginx/app.error.log",
  shadow: "/var/log/nginx/shadow.mirror.log",
};

const parsePositiveInt = (value, fallback, { min = 1, max = Number.MAX_SAFE_INTEGER } = {}) => {
  const normalized = normalizeValue(value);
  const parsed = Number.parseInt(normalized, 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  if (parsed < min) {
    return min;
  }
  if (parsed > max) {
    return max;
  }
  return parsed;
};

class DockerClient {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
  }

  async runDocker(args, options = {}) {
    const result = await runCommand(this.config.dockerBin, args, {
      timeoutMs: options.timeoutMs || this.config.commandTimeoutMs,
      input: options.input || "",
      env: options.env || process.env,
    });
    if (!options.allowFailure && result.code !== 0) {
      const detail = normalizeValue(result.stderr) || normalizeValue(result.stdout) || `exit ${result.code}`;
      const error = new Error(`docker command failed: ${detail}`);
      error.result = result;
      throw error;
    }
    return result;
  }

  assertContainerName(containerName) {
    if (!isContainerNameValid(containerName)) {
      throw new Error(`invalid container name: ${containerName}`);
    }
  }

  async execInContainer(containerName, commandArgs, options = {}) {
    this.assertContainerName(containerName);
    return this.runDocker(["exec", containerName, ...commandArgs], options);
  }

  async tailscaleStatus({ asJson = false } = {}) {
    if (asJson) {
      return this.execInContainer(this.config.tailscaleContainer, ["tailscale", "status", "--json"]);
    }
    return this.execInContainer(this.config.tailscaleContainer, ["tailscale", "status"]);
  }

  async tailscalePing(target, count) {
    const normalizedTarget = normalizeValue(target);
    if (!normalizedTarget) {
      throw new Error("tailscale ping requires target");
    }
    const pingCount = parsePositiveInt(count, 3, { min: 1, max: 10 });
    return this.execInContainer(this.config.tailscaleContainer, ["tailscale", "ping", "-c", String(pingCount), normalizedTarget]);
  }

  async tailscaleIp() {
    return this.execInContainer(this.config.tailscaleContainer, ["tailscale", "ip", "-4"]);
  }

  async nginxTest() {
    return this.execInContainer(this.config.nginxContainer, ["nginx", "-t"]);
  }

  async nginxReload() {
    await this.nginxTest();
    return this.execInContainer(this.config.nginxContainer, ["nginx", "-s", "reload"]);
  }

  async nginxVersion() {
    return this.execInContainer(this.config.nginxContainer, ["nginx", "-v"]);
  }

  async nginxLogs(logType, tailLines) {
    const normalizedType = normalizeValue(logType).toLowerCase();
    const logFile = LOG_TYPES[normalizedType];
    if (!logFile) {
      throw new Error(`unsupported nginx log type: ${logType}`);
    }
    const tail = parsePositiveInt(tailLines, this.config.defaultLogTail, { min: 1, max: this.config.maxLogLines });
    return this.execInContainer(this.config.nginxContainer, ["tail", "-n", String(tail), logFile], {
      allowFailure: true,
    });
  }

  async systemCommand(name) {
    switch (name) {
      case "ps":
        return this.runDocker(["ps", "-a"]);
      case "images":
        return this.runDocker(["images"]);
      case "networks":
        return this.runDocker(["network", "ls"]);
      case "volumes":
        return this.runDocker(["volume", "ls"]);
      case "info":
        return this.runDocker(["info"]);
      case "version":
        return this.runDocker(["version"]);
      default:
        throw new Error(`unsupported system command: ${name}`);
    }
  }

  async systemPrune(scope) {
    const normalized = normalizeValue(scope).toLowerCase();
    if (!normalized || normalized === "all") {
      return this.runDocker(["system", "prune", "-f"]);
    }
    if (normalized === "containers") {
      return this.runDocker(["container", "prune", "-f"]);
    }
    if (normalized === "images") {
      return this.runDocker(["image", "prune", "-af"]);
    }
    if (normalized === "networks") {
      return this.runDocker(["network", "prune", "-f"]);
    }
    if (normalized === "volumes") {
      return this.runDocker(["volume", "prune", "-f"]);
    }
    if (normalized === "builder") {
      return this.runDocker(["builder", "prune", "-af"]);
    }
    throw new Error(`unsupported prune scope: ${scope}`);
  }

  async systemRaw(args) {
    if (!Array.isArray(args) || args.length === 0) {
      throw new Error("system raw command requires non-empty args");
    }
    return this.runDocker(args);
  }

  async containerStatus(containerName) {
    this.assertContainerName(containerName);
    return this.runDocker(["ps", "-a", "--filter", `name=^/${containerName}$`]);
  }

  async containerLogs(containerName, options = {}) {
    this.assertContainerName(containerName);
    const args = ["logs"];
    const tail = parsePositiveInt(options.tail, this.config.defaultLogTail, { min: 1, max: this.config.maxLogLines });
    args.push("--tail", String(tail));
    if (normalizeValue(options.since)) {
      args.push("--since", normalizeValue(options.since));
    }
    if (normalizeValue(options.timestamps) === "1") {
      args.push("--timestamps");
    }
    args.push(containerName);
    return this.runDocker(args, { allowFailure: true });
  }

  async containerInspect(containerName) {
    this.assertContainerName(containerName);
    return this.runDocker(["inspect", containerName]);
  }

  async containerTop(containerName) {
    this.assertContainerName(containerName);
    return this.runDocker(["top", containerName], { allowFailure: true });
  }

  async containerStats(containerName) {
    this.assertContainerName(containerName);
    return this.runDocker(["stats", "--no-stream", containerName], { allowFailure: true });
  }

  async containerMutate(containerName, commandName) {
    this.assertContainerName(containerName);
    switch (commandName) {
      case "start":
        return this.runDocker(["start", containerName], { allowFailure: true });
      case "stop":
        return this.runDocker(["stop", containerName], { allowFailure: true });
      case "restart":
        return this.runDocker(["restart", containerName], { allowFailure: true });
      case "pause":
        return this.runDocker(["pause", containerName], { allowFailure: true });
      case "unpause":
        return this.runDocker(["unpause", containerName], { allowFailure: true });
      case "kill":
        return this.runDocker(["kill", containerName], { allowFailure: true });
      case "rm":
        return this.runDocker(["rm", "-f", containerName], { allowFailure: true });
      default:
        throw new Error(`unsupported container command: ${commandName}`);
    }
  }

  async containerRename(containerName, toName) {
    this.assertContainerName(containerName);
    this.assertContainerName(toName);
    return this.runDocker(["rename", containerName, toName], { allowFailure: true });
  }

  async containerUpdate(containerName, updateArgs) {
    this.assertContainerName(containerName);
    if (!Array.isArray(updateArgs) || updateArgs.length === 0) {
      throw new Error("container update requires args");
    }
    return this.runDocker(["update", ...updateArgs, containerName], { allowFailure: true });
  }

  async containerExec(containerName, shellName, commandText) {
    this.assertContainerName(containerName);
    const shell = normalizeValue(shellName) || this.config.execShell;
    const safeShell = ["sh", "bash", "zsh", "ash"].includes(shell) ? shell : "sh";
    const command = normalizeValue(commandText);
    if (!command) {
      throw new Error("container exec requires command");
    }
    return this.runDocker(["exec", containerName, safeShell, "-lc", command], { allowFailure: true });
  }

  async containerRaw(containerName, args) {
    this.assertContainerName(containerName);
    if (!Array.isArray(args) || args.length === 0) {
      throw new Error("container raw command requires args");
    }
    return this.runDocker([...args, containerName], { allowFailure: true });
  }
}

module.exports = {
  DockerClient,
  parsePositiveInt,
};
