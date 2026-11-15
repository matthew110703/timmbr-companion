export const authStrings = {
  header: {
    brand: 'Timmbr',
    badge: 'STAFF PORTAL',
    title: 'Staff Companion',
    subtitle:
      'Sign in with your organization staff credentials to manage workshop orders and dispatch updates.',
  },
  banner: {
    title: 'Staff-Only Access',
    description:
      'This application is restricted to authorized workshop craftsmen, dispatch coordinators, and administrators.',
  },
  form: {
    identifierLabel: 'Email or Username',
    identifierPlaceholder: 'staff@timmbr.com',
    passwordLabel: 'Password',
    passwordPlaceholder: '••••••••',
    submitButton: 'Sign In to Portal',
    submittingButton: 'Verifying Credentials...',
    errorTitle: 'Authentication Error',
    invitePrompt: 'Received a staff invitation?',
    activateInviteButton: 'Activate Staff Invite',
  },
  validation: {
    identifierRequired: 'Staff email or identifier is required',
    passwordRequired: 'Password must be at least 6 characters long',
    staffAccessRequired:
      'Access denied. Only organization staff accounts may sign in to Staff Companion.',
  },
  invitedBanner: {
    title: 'Account Activated',
    description: 'Your password is set. Sign in with your email and new password to continue.',
  },
  acceptInvite: {
    badge: 'INVITATION',
    title: 'Set Your Password',
    subtitle: 'Create a strong password to activate your Timmbr Staff Companion account.',
    manualTitle: 'Activate Staff Invitation',
    manualDescription:
      'Paste the invitation link (timmbr-companion://accept-invite?token=...) or raw token from your invite email.',
    manualInputLabel: 'Invitation Link or Token',
    manualInputPlaceholder: 'Paste invite link or 64-character token',
    manualTokenRequired: 'Please paste an invitation link or token to continue.',
    verifyButton: 'Verify Invitation',
    openMailpitButton: 'Open Local Mailpit Inbox',
    enterTokenManually: 'Enter Invite Token Manually',
    validating: 'Verifying invitation link...',
    invalidTitle: 'Invitation Unavailable',
    invalidDescription:
      'This invitation link has expired, was already used, or is invalid. Ask your administrator to resend the invite.',
    backToLogin: 'Back to Sign In',
    passwordLabel: 'New Password',
    passwordPlaceholder: 'Create a strong password',
    confirmPasswordLabel: 'Confirm Password',
    confirmPasswordPlaceholder: 'Re-enter your password',
    policyHint:
      'Use at least 8 characters with one uppercase letter, one number, and one special character.',
    submitButton: 'Set Password & Continue',
    submittingButton: 'Activating Account...',
    errorTitle: 'Setup Error',
  },
  footer: {
    help: 'Need access? Contact your workshop administrator or IT department.',
  },
};
