import { Link } from "@tanstack/react-router";
import { Menu, X } from "lucide-react";
import { useState } from "react";

export function SiteNav() {
  const [open, setOpen] = useState(false);
  return <header className="holdings-nav nesai-app-nav"><div className="shell nav-inner"><Link to="/" className="app-brand" aria-label="NesAI home"><img src="/nesai-symbol.png" alt="" /><span>Nes<span>AI</span></span></Link><nav className={open ? "nav-links open" : "nav-links"}><Link to="/" onClick={() => setOpen(false)}>Home</Link><Link to="/vault" onClick={() => setOpen(false)}>Resource vault</Link><Link to="/upgrade" onClick={() => setOpen(false)}>Premium</Link><Link className="nav-cta" to="/auth" onClick={() => setOpen(false)}>My account</Link></nav><button className="menu-button" aria-label="Toggle menu" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X size={21} /> : <Menu size={21} />}</button></div></header>;
}
