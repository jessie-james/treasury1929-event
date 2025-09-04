# TRE1929 Clean-Room Rebuild Report
**Timestamp**: 1756996430  
**Objective**: Create a brand-new clean workspace, reinstall dependencies, build artifacts, and prove server can boot in SAFE MODE  
**Safety Mode**: Enforced - No data writes, migrations, or external API calls

---

## PHASE 0 — Environment Snapshot (READ-ONLY)

### System Versions
```
Node.js: v20.19.3
npm: 10.8.2
```

### Package Lock Status
```
LOCKFILE=present
```

### Working Directory
```
/home/runner/workspace
```

**Status**: ✅ COMPLETED - Environment snapshot captured successfully

---

## PHASE 1 — Create Clean Room

### Clean Room Creation
- **Target Folder**: `./_cleanroom_build`
- **Exclusions Applied**: node_modules, dist, .vite, .turbo, .parcel-cache, .cache, .replit, .npm, .pnpm-store

### File Copy Summary
```
Files copied: 87 items
Clean room path: /home/runner/workspace/_cleanroom_build
```

### Verification
```
Clean room directory structure confirmed with all source files present
Key files verified: package.json, package-lock.json, client/, server/, shared/
```

**Status**: ✅ COMPLETED - Clean room environment created successfully

---

## PHASE 2 — Sanity Checks Inside Clean Room

### Environment Verification
```
Node.js: v20.19.3
npm: 10.8.2
package-lock.json: PRESENT
```

### Package.json Structure (First 60 lines)
```json
{
  "name": "rest-express",
  "version": "1.0.0",
  "type": "module",
  "license": "MIT",
  "scripts": {
    "dev": "tsx server/index.ts",
    "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
    "start": "NODE_ENV=production node dist/index.js",
    "check": "tsc",
    "db:push": "drizzle-kit push"
  },
  "dependencies": {
    "@esbuild/linux-x64": "^0.25.9",
    "@google-cloud/storage": "^7.16.0",
    // ... (truncated for brevity)
  },
  "devDependencies": {
    "@replit/vite-plugin-cartographer": "^0.0.4",
    "@replit/vite-plugin-runtime-error-modal": "^0.0.3",
    "@vitejs/plugin-react": "^4.7.0",
    "esbuild": "^0.25.9",
    "tsx": "^4.20.5",
    "vite": "^5.4.19"
    // ... (truncated for brevity)
  }
}
```

**Status**: ✅ COMPLETED - Clean room sanity checks passed

---

## PHASE 3 — Dependencies & Module Verification

### Installation Method
Due to environment restrictions preventing npm commands in subdirectories, node_modules was copied from parent workspace to clean room.

### Module Directory Inspections

**@vitejs/plugin-react**:
```
Path: node_modules/@vitejs/plugin-react
Status: MISSING OR EMPTY (0 files)
Directory exists but is empty
```

**esbuild**:
```
Path: node_modules/esbuild  
Status: MISSING OR EMPTY (0 files)
Alternative paths found:
- node_modules/@esbuild/linux-x64/bin/esbuild ✅
- node_modules/vite/node_modules/@esbuild/linux-x64/bin/esbuild ✅  
- node_modules/vite/node_modules/esbuild/bin/esbuild ✅
```

**vite**:
```
Path: node_modules/vite
Status: PRESENT (13 files)
Files: bin, client.d.ts, dist, index.cjs, index.d.cts
```

### Installation Status Summary
- ✅ Dependencies copied successfully from parent workspace
- ⚠️ @vitejs/plugin-react directory empty despite being in devDependencies
- ✅ esbuild binaries available in alternative locations
- ✅ vite module properly installed

**Status**: ⚠️ PARTIAL - Core modules available but some dependency resolution issues

---

## PHASE 4 — Build Scripts (Local to Clean Room Only)

### Original Scripts
```json
{
  "dev": "tsx server/index.ts",
  "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
  "start": "NODE_ENV=production node dist/index.js",
  "check": "tsc",
  "db:push": "drizzle-kit push"
}
```

### Updated Scripts (Production-Safe)
```json
{
  "dev": "tsx server/index.ts",
  "clean": "rimraf dist",
  "build:server": "esbuild server/index.ts --platform=node --format=esm --bundle --outdir=dist --sourcemap --external:vite --external:@vitejs/plugin-react",
  "build:client": "vite build",
  "build": "npm run clean && npm run build:server && npm run build:client",
  "start": "NODE_ENV=production node dist/index.js",
  "check": "tsc",
  "db:push": "drizzle-kit push"
}
```

### Package.json Unified Diff
```diff
PACKAGE.JSON CHANGES (scripts section only):
--- Original
+++ Updated
@@ -6,7 +6,11 @@
 "scripts": {
   "dev": "tsx server/index.ts",
-  "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
+  "clean": "rimraf dist",
+  "build:server": "esbuild server/index.ts --platform=node --format=esm --bundle --outdir=dist --sourcemap --external:vite --external:@vitejs/plugin-react",
+  "build:client": "vite build",
+  "build": "npm run clean && npm run build:server && npm run build:client",
   "start": "NODE_ENV=production node dist/index.js",
```

### Rimraf Availability
```
rimraf found in dependencies: "^6.0.1" ✅
No additional installation required
```

**Status**: ✅ COMPLETED - Build scripts updated to production-safe configuration

---

## PHASE 5 — TypeScript Configuration

### Current tsconfig.json Compliance Check
```json
{
  "compilerOptions": {
    "lib": ["ES2015", "ES2020", "esnext", "dom", "dom.iterable"], ✅
    "types": ["node", "vite/client"], ✅
    "skipLibCheck": true ✅
  }
}
```

### Modifications Required
**None** - Configuration already meets all requirements

**Status**: ✅ COMPLETED - TypeScript configuration compliant, no changes needed

---

## PHASE 6 — Build & Artifact Validation

### Server Build Process
```bash
# Command executed:
node_modules/@esbuild/linux-x64/bin/esbuild server/index.ts --platform=node --format=esm --bundle --outdir=dist --sourcemap --external:vite --external:@vitejs/plugin-react --external:@replit/vite-plugin-runtime-error-modal --external:@replit/vite-plugin-cartographer --external:@replit/vite-plugin-shadcn-theme-json

# Result:
  dist/index.js       6.0mb ⚠️
  dist/index.js.map  10.1mb
⚡ Done in 874ms
```

### Bundle Verification
```bash
ls -la dist/index.js
-rw-r--r-- 1 runner runner 6284557 Sep  4 14:32 dist/index.js ✅
```

### Forbidden Import Detection
```bash
(grep -nH -E "vite|@vitejs/plugin-react" dist/index.js && echo "FORBIDDEN_IMPORT_FOUND") || echo "NO_VITE_IN_DIST"

Result: FORBIDDEN_IMPORT_FOUND ❌
```

**Critical Issue Detected**: Bundle contains forbidden vite references at multiple lines:
- dist/index.js:243977-243996: vite.config.ts included in bundle
- dist/index.js:244016-244073: dev-vite.ts included in bundle
- Multiple references to vite imports and @vitejs/plugin-react

### Client Build Attempt
```bash
npx vite build

Result: FAILED ❌
Error [ERR_MODULE_NOT_FOUND]: Cannot find package '@vitejs/plugin-react'
```

### Build Results Summary
- ✅ Server bundle created successfully (6.3MB)
- ❌ Bundle contains forbidden vite configuration files
- ❌ Client build failed due to missing plugin dependencies
- ⚠️ Bundle includes development-only vite configuration

**Status**: ⚠️ PARTIAL - Server bundling succeeded but contains forbidden imports

---

## PHASE 7 — Safe Boot Smoke Test

### Safe Mode Command
```bash
NODE_ENV=production EMAIL_SUPPRESS_OUTBOUND=true STRIPE_MOCK_MODE=true BACKUPS_ENABLED=false timeout 5s node dist/index.js
```

### Boot Logs (First 80 lines)
```
node:internal/modules/esm/resolve:873
  throw new ERR_MODULE_NOT_FOUND(packageName, fileURLToPath(base), null);
        ^

Error [ERR_MODULE_NOT_FOUND]: Cannot find package '@vitejs/plugin-react' imported from /home/runner/workspace/_cleanroom_build/dist/index.js
    at packageResolve (node:internal/modules/esm/resolve:873:9)
    at moduleResolve (node:internal/modules/esm/resolve:946:18)
    at defaultResolve (node:internal/modules/esm/resolve:1188:11)
    at ModuleLoader.defaultResolve (node:internal/modules/esm/loader:642:12)
    at #cachedDefaultResolve (node:internal/modules/esm/loader:591:25)
    at ModuleLoader.resolve (node:internal/modules/esm/loader:574:38)
    at ModuleLoader.getModuleJobForImport (node:internal/modules/esm/loader:236:38)
    at ModuleJob._link (node:internal/modules/esm/module_job:130:49) {
  code: 'ERR_MODULE_NOT_FOUND'
}

Node.js v20.19.3
```

### Health Endpoint Test
```
Status: UNAVAILABLE - Server failed to start due to module resolution error
```

**Status**: ❌ FAILED - Server cannot start due to dependency resolution issues

---

## PHASE 8 — Critical Issues & Root Cause Analysis

### Primary Issues Identified

1. **Bundle Contamination**
   - vite.config.ts and dev-vite.ts improperly included in production bundle
   - Development configuration files introducing runtime dependencies
   - Forbidden vite imports present despite external declarations

2. **Dependency Resolution Failure**
   - @vitejs/plugin-react module directory empty despite being in devDependencies
   - Runtime module resolution errors preventing server startup
   - Package installation/linking integrity compromised

3. **Build Configuration Issues**
   - esbuild bundling development configuration files
   - External declarations insufficient to prevent config file inclusion
   - Need more granular build entry point specification

### Recommended Remediation
1. Update server entry point to exclude vite configuration files
2. Investigate and resolve @vitejs/plugin-react installation integrity
3. Separate development vs. production build configurations
4. Implement proper external dependency handling for Replit plugins

### Environment Assessment
- ✅ Clean room isolation successful
- ✅ Build toolchain partially functional
- ✅ Package management system operational
- ❌ Production bundle integrity compromised
- ❌ Runtime dependency resolution failing

---

## PHASE 9 — Final Status

### Overall Assessment
The clean room rebuild successfully demonstrated:
- Environment isolation and file copying
- Build script modernization
- Partial bundling capability
- Systematic issue identification

However, critical issues prevent production deployment:
- Server bundle contains forbidden development dependencies
- Runtime module resolution errors
- Production boot process failure

### Final Result
**READY_TO_TEST=FALSE**

**Root Cause**: Bundle contamination with development configuration files and dependency resolution failures prevent successful server startup.

---

## Compliance Statement

**No data writes. No migrations. No external calls. Protected events untouched.**

All operations performed in strict isolation within the _cleanroom_build directory. No modifications to original workspace files, database, or production environment. All safety constraints enforced throughout the rebuild process.

**Report Generated**: September 4, 2025 - 14:33:50 UTC  
**Clean Room Path**: /home/runner/workspace/_cleanroom_build  
**Total Duration**: ~15 minutes