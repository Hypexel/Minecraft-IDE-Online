import path from "path";
import { writeFileSafe, ensureDir } from "./fileManager";

export interface TemplateOptions {
  groupId?: string;
  artifactId?: string;
  version?: string;
  name?: string;
  packageName?: string;
  apiVersion?: string; // plugin.yml api-version
  spigotVersion?: string; // spigot-api version in pom
}

const DEFAULTS: TemplateOptions = {
  groupId: "com.example",
  artifactId: "myplugin",
  version: "1.0-SNAPSHOT",
  name: "MyPlugin",
  packageName: "com.example.myplugin",
  apiVersion: "1.21",
  spigotVersion: "1.21.5-R0.1-SNAPSHOT",
};

export function initTemplate(projectDir: string, opts?: TemplateOptions) {
  const o = { ...DEFAULTS, ...(opts || {}) };
  // cleanup and create directories
  ensureDir(projectDir);
  // standard maven layout
  const javaDir = path.join(projectDir, "src", "main", "java", ...o.packageName!.split("."));
  const resourcesDir = path.join(projectDir, "src", "main", "resources");

  writeFileSafe(path.join(projectDir, "pom.xml"), renderPom(o));
  writeFileSafe(path.join(resourcesDir, "plugin.yml"), renderPluginYml(o));
  writeFileSafe(path.join(javaDir, "MyPlugin.java"), renderMainJava(o));
}

/* Template renderers */
function renderPom(o: TemplateOptions) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0
           http://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>

  <groupId>${o.groupId}</groupId>
  <artifactId>${o.artifactId}</artifactId>
  <version>${o.version}</version>
  <name>${o.name}</name>
  <packaging>jar</packaging>

  <properties>
    <maven.compiler.release>21</maven.compiler.release>
    <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
    <spigot.api.version>${o.spigotVersion}</spigot.api.version>
  </properties>

  <repositories>
    <repository>
      <id>spigotmc-repo</id>
      <url>https://hub.spigotmc.org/nexus/content/repositories/snapshots/</url>
    </repository>
    <repository>
      <id>sonatype</id>
      <url>https://oss.sonatype.org/content/groups/public/</url>
    </repository>
  </repositories>

  <dependencies>
    <dependency>
      <groupId>org.spigotmc</groupId>
      <artifactId>spigot-api</artifactId>
      <version>\${spigot.api.version}</version>
      <scope>provided</scope>
    </dependency>
  </dependencies>

  <build>
    <plugins>
      <plugin>
        <groupId>org.apache.maven.plugins</groupId>
        <artifactId>maven-shade-plugin</artifactId>
        <version>3.5.1</version>
        <executions>
          <execution>
            <phase>package</phase>
            <goals><goal>shade</goal></goals>
          </execution>
        </executions>
      </plugin>
    </plugins>
    <resources>
      <resource>
        <directory>src/main/resources</directory>
        <filtering>false</filtering>
      </resource>
    </resources>
  </build>
</project>`;
}

function renderPluginYml(o: TemplateOptions) {
  return `name: ${o.name}
main: ${o.packageName}.MyPlugin
version: ${o.version}
api-version: '${o.apiVersion}'
author: you
commands:
  hello:
    description: Say hello
    usage: /hello
`;
}

function renderMainJava(o: TemplateOptions) {
  const pkg = o.packageName!;
  return `package ${pkg};

import org.bukkit.command.Command;
import org.bukkit.command.CommandSender;
import org.bukkit.plugin.java.JavaPlugin;

public class MyPlugin extends JavaPlugin {

    @Override
    public void onEnable() {
        getLogger().info("${o.name} enabled!");
    }

    @Override
    public void onDisable() {
        getLogger().info("${o.name} disabled!");
    }

    @Override
    public boolean onCommand(CommandSender sender, Command cmd, String label, String[] args) {
        if (\"hello\".equalsIgnoreCase(cmd.getName())) {
            sender.sendMessage(\"§aHello from ${o.name}!\");
            return true;
        }
        return false;
    }
}
`;
}
