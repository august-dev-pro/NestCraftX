const { execSync } = require("child_process");
const fs = require("fs");

function checkCommand(cmd) {
  try {
    execSync(`${cmd} --version`, { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

function getVersion(cmd) {
  try {
    const output = execSync(`${cmd} --version`, {
      encoding: "utf8",
      stdio: "pipe",
    });
    return output.trim().split("\n")[0];
  } catch {
    return "not installed";
  }
}

function checkSystemRequirements() {
  const checks = {
    node: {
      installed: checkCommand("node"),
      version: getVersion("node"),
    },
    npm: {
      installed: checkCommand("npm"),
      version: getVersion("npm"),
    },
    nestCli: {
      installed: checkCommand("nest"),
      version: getVersion("nest"),
    },
    git: {
      installed: checkCommand("git"),
      version: getVersion("git"),
    },
    docker: {
      installed: checkCommand("docker"),
      version: getVersion("docker"),
    },
    npx: {
      installed: checkCommand("npx"),
      version: "npx available",
    },
  };

  const envExists = fs.existsSync(".env");

  let postgresStatus = "not detected locally";
  if (envExists) {
    try {
      const envContent = fs.readFileSync(".env", "utf8");
      if (
        envContent.includes("POSTGRES_") ||
        envContent.includes("DATABASE_URL")
      ) {
        postgresStatus = "configured in .env";
      }
    } catch {}
  }

  checks.postgres = {
    installed: false,
    version: postgresStatus,
  };

  return checks;
}

function displaySystemCheck() {
  console.log("\n🔍 NestCraftX System Check");
  console.log("--------------------------------");

  const checks = checkSystemRequirements();
  let successCount = 0;
  let totalCount = 0;

  Object.entries(checks).forEach(([name, info]) => {
    totalCount++;
    const displayName =
      name.charAt(0).toUpperCase() + name.slice(1).replace(/([A-Z])/g, " $1");

    if (info.installed || info.version.includes("configured")) {
      console.log(`✅ ${displayName}: ${info.version}`);
      successCount++;
    } else {
      console.log(`⚠️  ${displayName}: ${info.version}`);
    }
  });

  console.log("--------------------------------");

  const status =
    successCount === totalCount
      ? "✅ Ready"
      : successCount >= totalCount - 2
      ? "⚠️  Almost Ready"
      : "❌ Missing Requirements";

  console.log(`System status: ${status} (${successCount}/${totalCount} OK)`);

  if (successCount < totalCount) {
    console.log("\n💡 Tips:");
    if (!checks.nestCli.installed) {
      console.log("   - Install Nest CLI: npm install -g @nestjs/cli");
    }
    if (!checks.docker.installed) {
      console.log("   - Install Docker: https://docs.docker.com/get-docker/");
    }
    if (!checks.git.installed) {
      console.log("   - Install Git: https://git-scm.com/downloads");
    }
  }

  console.log("");
}

module.exports = { checkSystemRequirements, displaySystemCheck };
