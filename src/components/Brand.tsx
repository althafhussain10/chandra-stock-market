import logo from "/public/chandra-logo.png";

export function Brand({ className = "" }: { className?: string }) {
  return <img src={logo} alt="Chandra stock screener" className={`h-7 w-auto ${className}`} />;
}