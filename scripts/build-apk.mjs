// Build a debug APK and install it on the connected device.
//   npm run apk              sync www/ -> assembleDebug -> adb install -> launch
//   npm run apk -- --no-launch   install but don't auto-launch
//   npm run apk -- --release     배포용: sync 후 dev-config.js(테스트 계정)를 제외하고 빌드
//
// 무빌드: www/ 의 정적 파일이 곧 앱이다 (webDir: "www"). 웹 빌드 단계 없음.
// ⚠ cap sync 는 gitignore 를 무시하고 www/ 전체를 복사하므로, gitignore 된
//   www/dev-config.js(테스트 계정)가 APK 에 딸려 들어간다. --release 로 제거한다.
//
// JAVA_HOME: uses the env var if set, else auto-detects Android Studio's bundled JDK.
// Windows-focused (matches this project's dev setup) but falls back sensibly elsewhere.
import { execSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
const noLaunch = args.includes("--no-launch");
const release = args.includes("--release");

const APP_ID = "com.heartguardians.app";
const APK = join("android", "app", "build", "outputs", "apk", "debug", "app-debug.apk");
const isWin = process.platform === "win32";
const gradlew = isWin ? ".\\gradlew.bat" : "./gradlew";

function resolveJavaHome() {
  if (process.env.JAVA_HOME && existsSync(process.env.JAVA_HOME)) return process.env.JAVA_HOME;
  const candidates = isWin
    ? [
        "C:\\Program Files\\Android\\Android Studio\\jbr",
        join(process.env.LOCALAPPDATA ?? "", "Programs", "Android Studio", "jbr"),
      ]
    : [
        "/Applications/Android Studio.app/Contents/jbr/Contents/Home", // macOS
        join(process.env.HOME ?? "", "android-studio", "jbr"), // Linux
      ];
  return candidates.find((p) => p && existsSync(join(p, "bin")));
}

function resolveAndroidHome() {
  for (const v of [process.env.ANDROID_HOME, process.env.ANDROID_SDK_ROOT]) {
    if (v && existsSync(v)) return v;
  }
  const candidates = isWin
    ? [join(process.env.LOCALAPPDATA ?? "", "Android", "Sdk")]
    : [
        join(process.env.HOME ?? "", "Library", "Android", "sdk"), // macOS
        join(process.env.HOME ?? "", "Android", "Sdk"), // Linux
      ];
  return candidates.find((p) => p && existsSync(p));
}

const javaHome = resolveJavaHome();
if (!javaHome) {
  console.error(
    "JAVA_HOME not set and Android Studio's bundled JDK was not found.\n" +
      "Set JAVA_HOME to a JDK and retry.",
  );
  process.exit(1);
}
const androidHome = resolveAndroidHome();
if (!androidHome) {
  console.error(
    "Android SDK not found. Set ANDROID_HOME, or add sdk.dir to android/local.properties.",
  );
  process.exit(1);
}

const env = { ...process.env, JAVA_HOME: javaHome, ANDROID_HOME: androidHome };
const run = (cmd, opts = {}) => {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { stdio: "inherit", env, ...opts });
};

console.log(`JAVA_HOME    = ${javaHome}`);
console.log(`ANDROID_HOME = ${androidHome}`);
run("npx cap sync android");

// 배포용 빌드: sync 가 복사해 넣은 테스트 계정 파일을 gradle 전에 제거한다.
if (release) {
  const devConfig = join("android", "app", "src", "main", "assets", "public", "dev-config.js");
  if (existsSync(devConfig)) {
    rmSync(devConfig);
    console.log(`\n✔ release: removed ${devConfig} (테스트 계정 제외)`);
  } else {
    console.log(`\n(release: dev-config.js not present after sync — 제외할 것 없음)`);
  }
}

run(gradlew + " assembleDebug", { cwd: "android" });

if (!existsSync(APK)) {
  console.error(`APK not found at ${APK}`);
  process.exit(1);
}
run(`adb install -r "${APK}"`);
if (!noLaunch) {
  run(`adb shell monkey -p ${APP_ID} -c android.intent.category.LAUNCHER 1`);
}
console.log("\n✔ Done — APK installed" + (noLaunch ? "." : " and launched."));
