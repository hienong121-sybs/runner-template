#!/usr/bin/env node
"use strict";

const fs = require("fs");
const helper = require("./setup-runner-helper");

void fs;

const executeMain = (() => {
  try {
    const step00_resolveDns = (() => {
      try {
        const probeHost = helper.pickProbeHost();
        helper.logInfo("setup-runner-prev", "step00_resolveDns is pending implementation");
        if (probeHost) {
          helper.logInfo("setup-runner-prev", `probe host candidate: ${probeHost}`);
        } else {
          helper.logInfo("setup-runner-prev", "probe host candidate is empty");
        }
        return {
          status: "pending",
          probeHost: probeHost || null,
        };
      } catch (error) {
        helper.logError("setup-runner-prev", error, "step00_resolveDns failed");
        throw error;
      }
    })();

    const step01_SumaryStep = (() => {
      try {
        helper.logInfo("setup-runner-prev", `summary: ${JSON.stringify(step00_resolveDns)}`);
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
