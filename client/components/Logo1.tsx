import React from "react";
import logoImg from "./images/takymed1.png";
import "../logo.css";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: "small" | "medium" | "large" | "xl";
}

const Logo: React.FC<LogoProps> = ({ className, size = "small" }) => {
  return (
    <div className={cn("logo-container", className)}>
      <img
        src={logoImg}
        alt="TAKYMED Logo"
        className={cn("logo-image", `logo-${size}`)}
      />
    </div>
  );
};

export default Logo;
