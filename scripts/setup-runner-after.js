#!/usr/bin/env node
"use strict";

const helper = require("./setup-runner-helper");

const executeMain = (async () => {
  try {
    const step00_resolveDns = await (async () => {
      try {
        const probeHost = helper.pickProbeHost();
        if (!probeHost) {
          helper.logInfo("setup-runner-after", "step00_resolveDns skipped because probe host is empty");
          return { skipped: true };
        }

        const timeoutSec = helper.readIntEnv("RUNNER_AFTER_DNS_TIMEOUT_SEC", 25);
        const intervalMs = helper.readIntEnv("RUNNER_AFTER_DNS_INTERVAL_MS", 2000);
        const required = helper.readEnv("RUNNER_AFTER_DNS_REQUIRED", "0") === "1";
        const deadline = Date.now() + timeoutSec * 1000;
        let attempt = 0;
        let lastError = "";

        while (Date.now() <= deadline) {
          attempt += 1;
          try {
            if (helper.canResolveHost(probeHost)) {
              helper.logInfo("setup-runner-after", `step00_resolveDns ok on attempt ${attempt}: ${probeHost}`);
              return {
                probeHost,
                attempt,
                required,
              };
            }
            helper.logInfo("setup-runner-after", `dns resolve attempt ${attempt} not ready: ${probeHost}`);
          } catch (error) {
            lastError = error && error.message ? error.message : String(error);
            helper.logInfo("setup-runner-after", `dns resolve attempt ${attempt} command warning: ${lastError}`);
          }
          await helper.sleep(intervalMs);
        }

        if (required) {
          throw new Error(`cannot resolve host '${probeHost}' after ${timeoutSec}s`);
        }

        helper.logInfo(
          "setup-runner-after",
          `step00_resolveDns pending after ${timeoutSec}s (non-blocking): host=${probeHost}${lastError ? `, lastError=${lastError}` : ""}`,
        );
        return {
          probeHost,
          pending: true,
          required,
          timeoutSec,
          lastError: lastError || null,
        };
      } catch (error) {
        helper.logError("setup-runner-after", error, "step00_resolveDns failed");
        throw error;
      }
    })();

    const step01_verifyNginxHealth = await (async () => {
      try {
        const nginxPort = helper.readIntEnv("NGINX_PORT", 8080);
        const timeoutSec = helper.readIntEnv("RUNNER_AFTER_HEALTH_TIMEOUT_SEC", 45);
        const intervalMs = helper.readIntEnv("RUNNER_AFTER_HEALTH_INTERVAL_MS", 2000);
        const url = `http://127.0.0.1:${nginxPort}/healthz`;
        const deadline = Date.now() + timeoutSec * 1000;
        let attempt = 0;

        while (Date.now() <= deadline) {
          attempt += 1;
          try {
            const response = await helper.request(url, 3000);
            if (response.statusCode >= 200 && response.statusCode < 300) {
              helper.logInfo("setup-runner-after", `step01_verifyNginxHealth ok on attempt ${attempt}: ${url}`);
              return { url, attempt, statusCode: response.statusCode };
            }
            helper.logInfo("setup-runner-after", `health check attempt ${attempt} returned ${response.statusCode}`);
          } catch (error) {
            helper.logInfo("setup-runner-after", `health check attempt ${attempt} failed: ${error.message}`);
          }
          await helper.sleep(intervalMs);
        }

        throw new Error(`health check failed for ${url} after ${timeoutSec}s`);
      } catch (error) {
        helper.logError("setup-runner-after", error, "step01_verifyNginxHealth failed");
        throw error;
      }
    })();

    const step02_showComposeStatus = (() => {
      try {
        const envFilePath = helper.readEnv("RUNNER_ENV_FILE", ".env");
        const result = helper.runCommand("docker", ["compose", "--env-file", envFilePath, "ps"], {
          allowFailure: true,
        });
        if (result.status === 0) {
          const output = String(result.stdout || "").trim();
          if (output) {
            console.log(output);
          }
        } else {
          const stderr = String(result.stderr || "").trim();
          helper.logInfo("setup-runner-after", `docker compose ps warning: ${stderr || `exit ${result.status}`}`);
        }
        return { status: result.status };
      } catch (error) {
        helper.logError("setup-runner-after", error, "step02_showComposeStatus failed");
        throw error;
      }
    })();

    const step03_SumaryStep = (() => {
      try {
        const hasRuntimeSnapshot = Boolean(helper.readFileIfExists(".nginx/runtime.env"));
        helper.logInfo("setup-runner-after", `runtime snapshot found: ${hasRuntimeSnapshot ? "yes" : "no"}`);
        helper.logInfo(
          "setup-runner-after",
          `summary: ${JSON.stringify({ step00_resolveDns, step01_verifyNginxHealth, step02_showComposeStatus })}`,
        );
        return {
          success: true,
          hasRuntimeSnapshot,
          totalSteps: 4,
        };
      } catch (error) {
        helper.logError("setup-runner-after", error, "step03_SumaryStep failed");
        throw error;
      }
    })();

    return {
      step00_resolveDns,
      step01_verifyNginxHealth,
      step02_showComposeStatus,
      step03_SumaryStep,
    };
  } catch (error) {
    helper.logError("setup-runner-after", error, "executeMain failed");
    process.exitCode = 1;
    return null;
  }
})();

void executeMain;
