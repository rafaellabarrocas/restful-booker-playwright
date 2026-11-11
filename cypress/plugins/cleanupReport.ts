/**
 * Node-side collector for test data that could not be removed after a test.
 *
 * A failed cleanup must never fail the test that produced it (that would hide the
 * real result), but it must not be silent either: leftovers on a shared environment
 * pollute other people's runs. Failures are collected here and printed once at the end.
 */

export interface CleanupFailure {
  spec: string;
  test: string;
  resource: string;
  status: number;
}

export function registerCleanupReport(on: Cypress.PluginEvents): void {
  const failures: CleanupFailure[] = [];

  on("task", {
    "cleanup:recordFailure"(failure: CleanupFailure) {
      failures.push(failure);
      return null;
    },
  });

  on("after:run", () => {
    if (failures.length === 0) return;

    process.stdout.write(
      `\n⚠ Cleanup: ${failures.length} test resource(s) could not be deleted and were left on the environment:\n`,
    );
    for (const f of failures) {
      process.stdout.write(`  - ${f.resource} → HTTP ${f.status}  (${f.spec} › ${f.test})\n`);
    }
  });
}
