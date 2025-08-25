# Minecraft Plugin IDE (Local)

This is a local tool for creating and managing Minecraft Java plugins.  
It generates plugin templates (with `pom.xml`, `plugin.yml`, and main class), builds them via Maven, and manages file structure.

## Features
- Create a new plugin project
- Generate `pom.xml` + `plugin.yml`
- Auto-generate plugin entry class
- Build with Maven
- Manage directories (copy, delete, list tree)

## Usage
### 1. Install dependencies
```bash
npm install
2. Start in dev mode
bash
Copy
Edit
npm run dev
3. Build
bash
Copy
Edit
npm run build
4. Create a new plugin project
ts
Copy
Edit
import { initTemplate } from "./src/filesystem";

initTemplate("example-plugin");
This will generate:

css
Copy
Edit
example-plugin/
 ├─ pom.xml
 ├─ src/main/resources/plugin.yml
 └─ src/main/java/com/example/myplugin/MyPlugin.java
