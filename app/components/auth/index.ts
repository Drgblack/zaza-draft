// If SignInForm / SignUpForm are *named* exports in their files:
export { SignInForm } from "./SignInForm";
export { SignUpForm } from "./SignUpForm";

// ProtectedRoute is a *default* export, so re-export it as a named symbol once:
export { default as ProtectedRoute } from "./ProtectedRoute";



