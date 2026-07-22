import { useEffect, useState } from "react";

/**
 * Fixed red warning banner shown whenever the app is talking to the V2 test
 * database (localStorage flag `motocare_use_v2 === 'true'`).
 *
 * Purpose: during Parallel Run, staff switch a device to V2 to enter test data.
 * If someone forgets to switch back and enters REAL invoices on V2, those rows
 * are wiped by the Golive TRUNCATE and lost forever. This banner makes the
 * active environment impossible to miss. It renders NOTHING in normal (V1) mode.
 *
 * The flag is per-device and set via console:
 *   localStorage.setItem('motocare_use_v2', 'true'); location.reload();
 */
export default function V2EnvironmentBanner() {
  const [useV2, setUseV2] = useState(false);

  useEffect(() => {
    const read = () => setUseV2(localStorage.getItem("motocare_use_v2") === "true");
    read();
    // React to changes made in other tabs on the same device.
    window.addEventListener("storage", read);
    return () => window.removeEventListener("storage", read);
  }, []);

  if (!useV2) return null;

  const switchBackToV1 = () => {
    localStorage.setItem("motocare_use_v2", "false");
    window.location.reload();
  };

  return (
    <div
      role="alert"
      className="fixed bottom-0 inset-x-0 z-[9999] bg-red-600 text-white text-center
                 text-sm sm:text-base font-bold px-4 py-2 shadow-lg
                 flex items-center justify-center gap-3 flex-wrap"
    >
      <span className="animate-pulse">⚠️</span>
      <span>MÔI TRƯỜNG THỬ NGHIỆM V2 — KHÔNG NHẬP HÓA ĐƠN THẬT</span>
      <button
        onClick={switchBackToV1}
        className="ml-2 rounded bg-white/20 hover:bg-white/30 px-2 py-0.5
                   text-xs font-semibold underline decoration-dotted"
      >
        Quay lại V1
      </button>
    </div>
  );
}
