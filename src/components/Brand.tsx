import logo from "@/assets/chandra-logo.png.asset.json";

export function Brand({ className = "" }: { className?: string }) {
  return <img src={logo.url} alt="Chandra stock screener" className={`h-7 w-auto ${className}`} />;
}
