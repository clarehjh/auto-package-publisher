#!/usr/bin/env node

const { Command } = require("commander");
const inquirer = require("inquirer");
const fs = require("fs-extra");
const path = require("path");
const chalk = require("chalk");
const ConfigPublisher = require("../src/index");

const program = new Command();

program
  .name("npm-config-publish")
  .description("配置化的NPM包发布工具")
  .version("1.0.0");

/**
 * 初始化配置文件
 */
program
  .command("init")
  .description("初始化配置文件")
  .option("-f, --file <file>", "配置文件路径", "publish-config.json")
  .action(async (options) => {
    try {
      const configPath = path.resolve(options.file);

      if (await fs.pathExists(configPath)) {
        const { overwrite } = await inquirer.prompt([
          {
            type: "confirm",
            name: "overwrite",
            message: `配置文件 ${options.file} 已存在，是否覆盖？`,
            default: false,
          },
        ]);

        if (!overwrite) {
          console.log(chalk.yellow("操作已取消"));
          return;
        }
      }

      const answers = await inquirer.prompt([
        {
          type: "input",
          name: "packageName",
          message: "包名称:",
          validate: (input) => (input.trim() ? true : "包名称不能为空"),
        },
        {
          type: "input",
          name: "version",
          message: "版本号:",
          default: "1.0.0",
          validate: (input) => {
            const semver = require("semver");
            return semver.valid(input) ? true : "请输入有效的语义化版本号";
          },
        },
        {
          type: "input",
          name: "packagePath",
          message: "包路径:",
          default: "./dist",
          validate: (input) => (input.trim() ? true : "包路径不能为空"),
        },
        {
          type: "input",
          name: "registry",
          message: "NPM仓库地址:",
          default: "https://registry.npmjs.org/",
        },
        {
          type: "list",
          name: "access",
          message: "发布权限:",
          choices: ["public", "restricted"],
          default: "public",
        },
        {
          type: "input",
          name: "npmToken",
          message: "NPM Token (或使用环境变量 NPM_TOKEN):",
          default: "${NPM_TOKEN}",
        },
      ]);

      const config = {
        packages: [
          {
            name: answers.packageName,
            version: answers.version,
            path: answers.packagePath,
            registry: answers.registry,
            access: answers.access,
            tag: "latest",
          },
        ],
        auth: {
          npm: {
            token: answers.npmToken,
          },
        },
        options: {
          dryRun: false,
          skipExisting: true,
          autoVersion: false,
        },
      };

      await fs.writeJson(configPath, config, { spaces: 2 });

      console.log(chalk.green(`✅ 配置文件已创建: ${configPath}`));
      console.log(chalk.blue("\n📝 下一步:"));
      console.log(chalk.white("1. 编辑配置文件添加更多包或修改设置"));
      console.log(
        chalk.white("2. 运行: npm-config-publish --config " + options.file)
      );
    } catch (error) {
      console.error(chalk.red(`❌ 初始化失败: ${error.message}`));
      process.exit(1);
    }
  });

/**
 * 发布命令
 */
program
  .command("publish")
  .description("发布包到NPM")
  .option("-c, --config <file>", "配置文件路径", "publish-config.json")
  .option("--dry-run", "试运行模式，不实际发布")
  .action(async (options) => {
    try {
      const configPath = path.resolve(options.config);

      if (!(await fs.pathExists(configPath))) {
        console.error(chalk.red(`❌ 配置文件不存在: ${configPath}`));
        console.log(
          chalk.yellow('💡 提示: 运行 "npm-config-publish init" 创建配置文件')
        );
        process.exit(1);
      }

      const publisher = new ConfigPublisher(configPath);

      // 如果是试运行模式，修改配置
      if (options.dryRun) {
        const config = await publisher.loadConfig();
        config.options = config.options || {};
        config.options.dryRun = true;
        publisher.config = config;
      }

      await publisher.publish();

      // 清理临时文件
      await publisher.cleanup();
    } catch (error) {
      console.error(chalk.red(`❌ 发布失败: ${error.message}`));
      process.exit(1);
    }
  });

/**
 * 验证配置
 */
program
  .command("validate")
  .description("验证配置文件")
  .option("-c, --config <file>", "配置文件路径", "publish-config.json")
  .action(async (options) => {
    try {
      const configPath = path.resolve(options.config);
      const publisher = new ConfigPublisher(configPath);

      await publisher.loadConfig();
      publisher.validateConfig();

      console.log(chalk.green("✅ 配置文件验证通过"));

      // 显示配置摘要
      console.log(chalk.blue("\n📊 配置摘要:"));
      console.log(chalk.white(`包数量: ${publisher.config.packages.length}`));
      publisher.config.packages.forEach((pkg, index) => {
        console.log(
          chalk.white(
            `  ${index + 1}. ${pkg.name}@${pkg.version} (${pkg.path})`
          )
        );
      });
    } catch (error) {
      console.error(chalk.red(`❌ 配置验证失败: ${error.message}`));
      process.exit(1);
    }
  });

/**
 * 版本管理
 */
program
  .command("version")
  .description("版本管理工具")
  .option("-c, --config <file>", "配置文件路径", "publish-config.json")
  .option("-t, --type <type>", "版本类型 (patch|minor|major)", "patch")
  .action(async (options) => {
    try {
      const configPath = path.resolve(options.config);
      const config = await fs.readJson(configPath);

      for (const pkg of config.packages) {
        const semver = require("semver");
        const newVersion = semver.inc(pkg.version, options.type);

        if (newVersion) {
          pkg.version = newVersion;
          console.log(
            chalk.green(`✅ ${pkg.name}: ${pkg.version} → ${newVersion}`)
          );
        } else {
          console.log(chalk.red(`❌ ${pkg.name}: 无效的版本号 ${pkg.version}`));
        }
      }

      await fs.writeJson(configPath, config, { spaces: 2 });
      console.log(chalk.green("✅ 版本已更新"));
    } catch (error) {
      console.error(chalk.red(`❌ 版本更新失败: ${error.message}`));
      process.exit(1);
    }
  });

// 默认命令
program
  .option("-c, --config <file>", "配置文件路径", "publish-config.json")
  .action(async (options) => {
    // 如果没有指定子命令，执行发布
    const publisher = new ConfigPublisher(options.config);
    await publisher.publish();
    await publisher.cleanup();
  });

program.parse();
