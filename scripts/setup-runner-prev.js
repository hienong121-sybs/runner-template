#!/usr/bin/env node
"use strict";

const fs = require("fs");
const helper = require("./setup-runner-helper");

const executeMain = (() => {
  try {
    const envFilePath = helper.readEnv("RUNNER_ENV_FILE", ".env");

    const step00_resolveDns = (() => {
      const persistEnvValue = (key, value) => {
        process.env[key] = value;
        return helper.updateEnvFileValue(envFilePath, key, value);
      };
      const normalizeOnOff = (rawValue, fallbackValue) => {
        const normalized = helper.normalizeValue(rawValue);
        if (!normalized) {
          return fallbackValue;
        }
        return normalized === "1" ? "1" : "0";
      };
      const normalizeDomainToken = (rawValue) => {
        let normalized = helper.normalizeValue(rawValue);
        while (normalized.startsWith("~")) {
          normalized = normalized.slice(1);
        }
        while (normalized.startsWith(".")) {
          normalized = normalized.slice(1);
        }
        if (!normalized) {
          return "";
        }
        return `~${normalized}`;
      };
      const normalizeTailnetDnsDomain = (rawValue) => {
        let normalized = helper.normalizeValue(rawValue);
        while (normalized.startsWith(".")) {
          normalized = normalized.slice(1);
        }
        while (normalized.endsWith(".")) {
          normalized = normalized.slice(0, -1);
        }
        if (!normalized) {
          return "";
        }
        return normalized.endsWith(".ts.net") ? normalized : `${normalized}.ts.net`;
      };
      const runResolvectlWithOptionalSudo = (args) => {
        const command = `resolvectl ${args.join(" ")}`;

        const runResultToError = (result) => {
          const stderr = String(result.stderr || "").trim();
          const stdout = String(result.stdout || "").trim();
          return stderr || stdout || `exit ${result.status}`;
        };

        try {
          const direct = helper.runCommand("resolvectl", args, { allowFailure: true });
          if (direct.status === 0) {
            return {
              ok: true,
              mode: "direct",
              command,
            };
          }
        } catch (error) {
          // ignore and fallback to sudo -n
          void error;
        }

        try {
          const sudoResult = helper.runCommand("sudo", ["-n", "resolvectl", ...args], { allowFailure: true });
          if (sudoResult.status === 0) {
            return {
              ok: true,
              mode: "sudo",
              command: `sudo -n ${command}`,
            };
          }
          return {
            ok: false,
            mode: "sudo",
            command: `sudo -n ${command}`,
            error: runResultToError(sudoResult),
          };
        } catch (error) {
          return {
            ok: false,
            mode: "none",
            command: `sudo -n ${command}`,
            error: error && error.message ? error.message : String(error),
          };
        }
      };
      const readCurrentDomainTokens = (dnsInterface) => {
        const parseTokens = (rawOutput) => {
          const text = String(rawOutput || "").trim();
          if (!text) {
            return [];
          }
          const payload = text.includes(":") ? text.slice(text.indexOf(":") + 1) : text;
          const tokens = [];
          for (const candidate of payload.split(/\s+/)) {
            const token = candidate.trim();
            if (!token || !/^~?[A-Za-z0-9.-]+$/.test(token)) {
              continue;
            }
            const normalized = normalizeDomainToken(token);
            if (normalized && !tokens.includes(normalized)) {
              tokens.push(normalized);
            }
          }
          return tokens;
        };

        try {
          const direct = helper.runCommand("resolvectl", ["domain", dnsInterface], { allowFailure: true });
          if (direct.status === 0) {
            return parseTokens(direct.stdout);
          }
        } catch (error) {
          void error;
        }

        try {
          const sudoResult = helper.runCommand("sudo", ["-n", "resolvectl", "domain", dnsInterface], { allowFailure: true });
          if (sudoResult.status === 0) {
            return parseTokens(sudoResult.stdout);
          }
        } catch (error) {
          void error;
        }

        return [];
      };

      try {
        const tailnetDnsDomain = normalizeTailnetDnsDomain(helper.readEnv("TAILSCALE_TAILNET_DNS", ""));
        if (!tailnetDnsDomain) {
          helper.logInfo("setup-runner-prev", "step00_resolveDns skipped because TAILSCALE_TAILNET_DNS is empty");
          return {
            skipped: true,
            reason: "tailnet_dns_empty",
          };
        }

        const dnsNameserverPrimary = helper.readEnv(
          "DNS_NAMESERVER_PRIMARY",
          helper.readEnv("TAILSCALE_DNS_NAMESERVER_PRIMARY", "100.100.100.100"),
        ) || "100.100.100.100";
        const dnsNameserverFallback = helper.readEnv(
          "DNS_NAMESERVER_FALLBACK",
          helper.readEnv("TAILSCALE_DNS_NAMESERVER_FALLBACK", "1.1.1.1"),
        );
        const dnsSearchDomainLegacy = helper.readEnv("DNS_SEARCH_DOMAIN", tailnetDnsDomain);
        const dnsSetupEnabledLegacy = normalizeOnOff(process.env.DNS_SETUP_ENABLED, "");

        if (!helper.readEnv("TAILSCALE_DNS_NAMESERVER_PRIMARY", "")) {
          const envUpdated = persistEnvValue("TAILSCALE_DNS_NAMESERVER_PRIMARY", dnsNameserverPrimary);
          if (!envUpdated) {
            helper.logInfo("setup-runner-prev", `step00_resolveDns warning: cannot persist TAILSCALE_DNS_NAMESERVER_PRIMARY to '${envFilePath}'`);
          }
        }

        if (dnsNameserverFallback && !helper.readEnv("TAILSCALE_DNS_NAMESERVER_FALLBACK", "")) {
          const envUpdated = persistEnvValue("TAILSCALE_DNS_NAMESERVER_FALLBACK", dnsNameserverFallback);
          if (!envUpdated) {
            helper.logInfo("setup-runner-prev", `step00_resolveDns warning: cannot persist TAILSCALE_DNS_NAMESERVER_FALLBACK to '${envFilePath}'`);
          }
        }

        const dnsSearchDomain = helper.readEnv("TAILSCALE_DNS_SEARCH_DOMAIN", dnsSearchDomainLegacy || tailnetDnsDomain);
        if (dnsSearchDomain && !helper.readEnv("TAILSCALE_DNS_SEARCH_DOMAIN", "")) {
          const envUpdated = persistEnvValue("TAILSCALE_DNS_SEARCH_DOMAIN", dnsSearchDomain);
          if (!envUpdated) {
            helper.logInfo("setup-runner-prev", `step00_resolveDns warning: cannot persist TAILSCALE_DNS_SEARCH_DOMAIN to '${envFilePath}'`);
          }
        }

        const dnsSetupEnabledCurrent = normalizeOnOff(process.env.TAILSCALE_DNS_SETUP_ENABLED, "1");
        const dnsSetupEnabled = dnsSetupEnabledLegacy || dnsSetupEnabledCurrent;
        if (dnsSetupEnabled && !helper.readEnv("TAILSCALE_DNS_SETUP_ENABLED", "")) {
          const envUpdated = persistEnvValue("TAILSCALE_DNS_SETUP_ENABLED", dnsSetupEnabled);
          if (!envUpdated) {
            helper.logInfo("setup-runner-prev", `step00_resolveDns warning: cannot persist TAILSCALE_DNS_SETUP_ENABLED to '${envFilePath}'`);
          }
        }

        const dnsInterface = helper.readEnv("DNS_INTERFACE", "tailscale0");
        const resolverApply = (() => {
          if (!helper.isLinux()) {
            helper.logInfo("setup-runner-prev", "step00_resolveDns resolver config skipped: non-linux runtime");
            return {
              attempted: false,
              applied: false,
              reason: "non_linux_runtime",
            };
          }
          if (!fs.existsSync(`/sys/class/net/${dnsInterface}`)) {
            helper.logInfo("setup-runner-prev", `step00_resolveDns resolver config deferred: interface '${dnsInterface}' not found yet`);
            return {
              attempted: false,
              applied: false,
              reason: "interface_not_found_yet",
              dnsInterface,
            };
          }

          const desiredDomainTokens = [];
          const tsDomainToken = normalizeDomainToken("ts.net");
          if (tsDomainToken) {
            desiredDomainTokens.push(tsDomainToken);
          }
          const tailnetDomainToken = normalizeDomainToken(tailnetDnsDomain);
          if (tailnetDomainToken && !desiredDomainTokens.includes(tailnetDomainToken)) {
            desiredDomainTokens.push(tailnetDomainToken);
          }

          const existingDomainTokens = readCurrentDomainTokens(dnsInterface);
          const mergedDomainTokens = [...existingDomainTokens];
          for (const token of desiredDomainTokens) {
            if (!mergedDomainTokens.includes(token)) {
              mergedDomainTokens.push(token);
            }
          }

          const dnsResult = runResolvectlWithOptionalSudo(["dns", dnsInterface, dnsNameserverPrimary]);
          const domainResult = runResolvectlWithOptionalSudo([
            "domain",
            dnsInterface,
            ...(mergedDomainTokens.length > 0 ? mergedDomainTokens : desiredDomainTokens),
          ]);

          const applied = dnsResult.ok && domainResult.ok;
          if (applied) {
            helper.logInfo(
              "setup-runner-prev",
              `step00_resolveDns resolver config ok: ${dnsResult.command} ; ${domainResult.command}`,
            );
          } else {
            helper.logInfo(
              "setup-runner-prev",
              `step00_resolveDns resolver config pending: dnsError=${dnsResult.error || "none"}, domainError=${domainResult.error || "none"}`,
            );
          }

          return {
            attempted: true,
            applied,
            dnsInterface,
            domains: mergedDomainTokens.length > 0 ? mergedDomainTokens : desiredDomainTokens,
            desiredDomains: desiredDomainTokens,
            existingDomains: existingDomainTokens,
            dnsCommand: dnsResult.command,
            domainCommand: domainResult.command,
            dnsError: dnsResult.error || null,
            domainError: domainResult.error || null,
          };
        })();
        return {
          skipped: false,
          dnsNameserverPrimary,
          tailnetDnsDomain,
          resolverApply,
        };
      } catch (error) {
        helper.logError("setup-runner-prev", error, "step00_resolveDns failed");
        throw error;
      }
    })();

    const step01_SumaryStep = (() => {
      try {
        helper.logInfo("setup-runner-prev", `summary: ${JSON.stringify({ step00_resolveDns })}`);
        return {
          success: true,
          totalSteps: 2,
        };
      } catch (error) {
        helper.logError("setup-runner-prev", error, "step01_SumaryStep failed");
        throw error;
      }
    })();

    return {
      step00_resolveDns,
      step01_SumaryStep,
    };
  } catch (error) {
    helper.logError("setup-runner-prev", error, "executeMain failed");
    process.exitCode = 1;
    return null;
  }
})();

void executeMain;
