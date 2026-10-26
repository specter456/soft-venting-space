/** Rich world gradient used for custom-game thumbnails (inline style). */
export function worldGradientFor(world: string): string {
  switch (world) {
    case "sky": return "linear-gradient(135deg, #B8D4E8, #E8F0F8)";
    case "sunset": return "linear-gradient(135deg, #E8C8A0, #D090B0)";
    case "starry": return "linear-gradient(135deg, #283058, #484078)";
    case "garden": return "linear-gradient(135deg, #B4D8B0, #E0F0D8)";
    case "sea": return "linear-gradient(135deg, #80C0D8, #C0E8F0)";
    case "cozy": return "linear-gradient(135deg, #E8D8C8, #F8F0E8)";
    default: return "linear-gradient(135deg, #B8D4E8, #E8F0F8)";
  }
}
