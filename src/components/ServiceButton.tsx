interface ServiceButtonProps {
  title: string;
  onClick: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export function ServiceButton({ title, onClick, className = "", style }: ServiceButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`service-button w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 flex items-center justify-center cursor-pointer ${className}`}
      style={style}
    >
      <span className="text-xs md:text-sm lg:text-base font-bold text-primary-foreground text-center leading-tight px-1">
        {title}
      </span>
    </button>
  );
}
