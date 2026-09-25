"use client";

export function Salir() {
  return (
    <button
      type="button"
      className="text-sm text-white underline"
      onClick={() => {
        void fetch("/api/logout", { method: "POST" }).then(() => {
          window.location.href = "/login";
        });
      }}
    >
      Salir
    </button>
  );
}
