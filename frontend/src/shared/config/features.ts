// Feature flags de build.
//
// IA_ENABLED: la IA (chat + feedback) está desactivada en producción hasta que IT
// actualice el modelo de CPU de la VM. numpy 2.x / torch exigen x86-64-v2 + AVX, y la
// VM actual ("Common KVM processor", qemu64) solo expone x86-64-v1 → el backend corre
// con IA_ENABLED=false. Para re-activar: VITE_IA_ENABLED=true en frontend/.env.production
// (e IA_ENABLED=true en el backend .env) y rebuildear.
//
// Default true → en desarrollo la IA sigue visible sin tocar nada.
export const IA_ENABLED = import.meta.env.VITE_IA_ENABLED !== "false"
