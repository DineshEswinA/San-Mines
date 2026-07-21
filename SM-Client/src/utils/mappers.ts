// Normalises material objects from API responses into a consistent UI shape.
// The API may return { material_name, display_name } or a flat string.

export interface MaterialUI {
  id: number;
  material_name: string;
  display_name: string;
}

export function mapApiToUiMaterial(raw: any): MaterialUI {
  return {
    id: raw.id,
    material_name: raw.material_name ?? raw.materialName ?? '',
    display_name: raw.display_name ?? raw.displayName ?? raw.material_name ?? '',
  };
}

export function mapUiToApiMaterial(ui: MaterialUI): Record<string, unknown> {
  return {
    material_name: ui.material_name,
    display_name: ui.display_name,
  };
}
