import { Link } from "react-router-dom";
import wheelUrl from "@/assets/dk-steering-wheel.webp";

/** The DrivingKlass wheel and wordmark, exactly as in the home page header (same wheel, gold foil lettering and divider), for the sign in, sign up and password pages. */
export function AuthBrand() {
  return (
    <Link to="/" className="dk-authbrand" aria-label="DrivingKlass home">
      <span className="n2-hdr-wheelwrap" style={{ "--wheel": `url(${wheelUrl})` } as React.CSSProperties}>
        <img className="n2-hdr-wheel" src={wheelUrl} alt="" width={480} height={480} decoding="async" />
      </span>
      <span className="n2-hdr-sep" aria-hidden="true" />
      <span className="n2-hdr-word">DrivingKlass</span>
    </Link>
  );
}
