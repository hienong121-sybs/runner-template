#!/usr/bin/env node
"use strict";

const helper = require("./setup-runner-helper");

const persistEnv = (envFilePath, key, value) => {
  process.env[key] = value;
  return helper.updateEnvFileValue(envFilePath, key, value);
};

const executeMain = (() => {
  try {
    const envFilePath = helper.readEnv("RUNNER_ENV_FILE", ".env");

    const step00_populateMirrorSlot00FromDateTime = (() => {
      const isValidPort = (value) => {
        const normalized = helper.normalizeValue(value);
        if (!/^\d+$/.test(normalized)) {
          return false;
        }
        const parsed = Number.parseInt(normalized, 10);
        return Number.isFinite(parsed) && parsed >= 1 && parsed <= 65535;
      };
      const parseYyyymmddhh = (rawValue) => {
        const normalized = helper.normalizeValue(rawValue);
        if (!/^\d{10}$/.test(normalized)) {
          return null;
        }

        const year = Number.parseInt(normalized.slice(0, 4), 10);
        const month = Number.parseInt(normalized.slice(4, 6), 10);
        const day = Number.parseInt(normalized.slice(6, 8), 10);
        const hour = Number.parseInt(normalized.slice(8, 10), 10);
        const date = new Date(Date.UTC(year, month - 1, day, hour, 0, 0, 0));

        if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day || date.getUTCHours() !== hour) {
          return null;
        }
        return date;
      };
      const formatYyyymmddhh = (date) => {
        const year = String(date.getUTCFullYear()).padStart(4, "0");
        const month = String(date.getUTCMonth() + 1).padStart(2, "0");
        const day = String(date.getUTCDate()).padStart(2, "0");
        const hour = String(date.getUTCHours()).padStart(2, "0");
        return `${year}${month}${day}${hour}`;
      };
      const incrementYyyymmddhh = (rawValue) => {
        const parsed = parseYyyymmddhh(rawValue);
        if (!parsed) {
          return "";
        }
        parsed.setUTCHours(parsed.getUTCHours() + 1);
        return formatYyyymmddhh(parsed);
      };
      try {
        const currentSlot00 = helper.readEnv("NGINX_MIRROR_URL_PORT_00", "");
        if (currentSlot00) {
          helper.logInfo("setup-runner-prev", `step00_populateMirrorSlot00FromDateTime skipped: existing NGINX_MIRROR_URL_PORT_00=${currentSlot00}`);
          return {
            skipped: true,
            reason: "slot_00_already_set",
            value: currentSlot00,
          };
        }

        const nowHourKey = helper.readEnv("DOTENVRTDB_NOW_YYYYDDMMHH", "");
        let tailnetDns = helper.readEnv("TAILSCALE_TAILNET_DNS", "");
        if (tailnetDns.startsWith(".")) {
          tailnetDns = tailnetDns.slice(1);
        }
        if (!nowHourKey || !tailnetDns) {
          helper.logInfo(
            "setup-runner-prev",
            "step00_populateMirrorSlot00FromDateTime skipped: missing DOTENVRTDB_NOW_YYYYDDMMHH or TAILSCALE_TAILNET_DNS",
          );
          return {
            skipped: true,
            reason: "missing_datetime_or_tailnet_dns",
            nowHourKey: nowHourKey || null,
            tailnetDns: tailnetDns || null,
          };
        }

        const nextHourKey = incrementYyyymmddhh(nowHourKey);
        if (!nextHourKey) {
          helper.logInfo("setup-runner-prev", `step00_populateMirrorSlot00FromDateTime skipped: invalid DOTENVRTDB_NOW_YYYYDDMMHH='${nowHourKey}'`);
          return {
            skipped: true,
            reason: "invalid_datetime",
            nowHourKey,
          };
        }

        let mirrorPort = helper.readEnv("NGINX_PORT", "8080");
        if (!isValidPort(mirrorPort)) {
          mirrorPort = "8080";
        }

        const slot00Value = `${nextHourKey}.${tailnetDns}:${mirrorPort}`;
        const envUpdated = persistEnv(envFilePath, "NGINX_MIRROR_URL_PORT_00", slot00Value);
        helper.logInfo("setup-runner-prev", `step00_populateMirrorSlot00FromDateTime auto-set NGINX_MIRROR_URL_PORT_00=${slot00Value}`);
        if (!envUpdated) {
          helper.logInfo("setup-runner-prev", `step00_populateMirrorSlot00FromDateTime warning: cannot persist to env file '${envFilePath}'`);
        }
        return {
          skipped: false,
          value: slot00Value,
          envFilePath,
          envUpdated,
        };
      } catch (error) {
        helper.logError("setup-runner-prev", error, "step00_populateMirrorSlot00FromDateTime failed");
        throw error;
      }
    })();

    const step01_resolveDns = (() => {
      try {
        const dnsNameserverPrimary = helper.normalizeValue(process.env.DNS_NAMESERVER_PRIMARY);
        if (!dnsNameserverPrimary) {
          helper.logInfo("setup-runner-prev", "step01_resolveDns skipped because DNS_NAMESERVER_PRIMARY is empty");
          return {
            skipped: true,
            reason: "dns_nameserver_primary_empty",
            probeHost: null,
          };
        }

        if (!helper.readEnv("TAILSCALE_DNS_NAMESERVER_PRIMARY", "")) {
          const envUpdated = persistEnv(envFilePath, "TAILSCALE_DNS_NAMESERVER_PRIMARY", dnsNameserverPrimary);
          if (!envUpdated) {
            helper.logInfo("setup-runner-prev", `step01_resolveDns warning: cannot persist TAILSCALE_DNS_NAMESERVER_PRIMARY to '${envFilePath}'`);
          }
        }

        const dnsNameserverFallback = helper.normalizeValue(process.env.DNS_NAMESERVER_FALLBACK);
        if (dnsNameserverFallback && !helper.readEnv("TAILSCALE_DNS_NAMESERVER_FALLBACK", "")) {
          const envUpdated = persistEnv(envFilePath, "TAILSCALE_DNS_NAMESERVER_FALLBACK", dnsNameserverFallback);
          if (!envUpdated) {
            helper.logInfo("setup-runner-prev", `step01_resolveDns warning: cannot persist TAILSCALE_DNS_NAMESERVER_FALLBACK to '${envFilePath}'`);
          }
        }

        const dnsSearchDomain = helper.normalizeValue(process.env.DNS_SEARCH_DOMAIN);
        if (dnsSearchDomain && !helper.readEnv("TAILSCALE_DNS_SEARCH_DOMAIN", "")) {
          const envUpdated = persistEnv(envFilePath, "TAILSCALE_DNS_SEARCH_DOMAIN", dnsSearchDomain);
          if (!envUpdated) {
            helper.logInfo("setup-runner-prev", `step01_resolveDns warning: cannot persist TAILSCALE_DNS_SEARCH_DOMAIN to '${envFilePath}'`);
          }
        }

        const dnsSetupEnabled = helper.normalizeValue(process.env.DNS_SETUP_ENABLED);
        if (dnsSetupEnabled && !helper.readEnv("TAILSCALE_DNS_SETUP_ENABLED", "")) {
          const envUpdated = persistEnv(envFilePath, "TAILSCALE_DNS_SETUP_ENABLED", dnsSetupEnabled);
          if (!envUpdated) {
            helper.logInfo("setup-runner-prev", `step01_resolveDns warning: cannot persist TAILSCALE_DNS_SETUP_ENABLED to '${envFilePath}'`);
          }
        }

        const probeHost = helper.pickProbeHost();
        if (!probeHost) {
          helper.logInfo("setup-runner-prev", "step01_resolveDns skipped because probe host candidate is empty");
          return {
            skipped: true,
            reason: "probe_host_empty",
            dnsNameserverPrimary,
            probeHost: null,
          };
        }

        let canResolve = false;
        let resolveError = "";
        try {
          canResolve = helper.canResolveHost(probeHost);
        } catch (error) {
          resolveError = error && error.message ? error.message : String(error);
          helper.logInfo("setup-runner-prev", `step01_resolveDns pending: resolver probe command failed (${resolveError})`);
        }
        helper.logInfo("setup-runner-prev", `step01_resolveDns ${canResolve ? "ok" : "pending"}: probe host=${probeHost}`);
        return {
          skipped: false,
          dnsNameserverPrimary,
          probeHost,
          canResolve,
          resolveError: resolveError || null,
        };
      } catch (error) {
        helper.logError("setup-runner-prev", error, "step01_resolveDns failed");
        throw error;
      }
    })();

    const step02_SumaryStep = (() => {
      try {
        helper.logInfo("setup-runner-prev", `summary: ${JSON.stringify({ step00_populateMirrorSlot00FromDateTime, step01_resolveDns })}`);
        return {
          success: true,
          totalSteps: 3,
        };
      } catch (error) {
        helper.logError("setup-runner-prev", error, "step02_SumaryStep failed");
        throw error;
      }
    })();

    return {
      step00_populateMirrorSlot00FromDateTime,
      step01_resolveDns,
      step02_SumaryStep,
    };
  } catch (error) {
    helper.logError("setup-runner-prev", error, "executeMain failed");
    process.exitCode = 1;
    return null;
  }
})();

void executeMain;
