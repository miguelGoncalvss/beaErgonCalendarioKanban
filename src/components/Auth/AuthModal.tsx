import { AuthDrawer } from './AuthDrawer';

// Re-export AuthDrawer as both AuthDrawer and AuthModal for compatibility
export { AuthDrawer };
export const AuthModal = AuthDrawer;
export default AuthDrawer;
