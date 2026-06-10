// src/app/(auth)/register/legal-notice.tsx
// Legal consent notice for registration form
// Add this component inside the register form, just above the submit button

export default function LegalNotice() {
  return (
    <p className="text-xs text-slate-500 text-center leading-relaxed">
      Ao criar sua conta, você concorda com nossos{" "}
      <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-emerald-600 underline font-medium">
        Termos de Uso
      </a>
      {" "}e nossa{" "}
      <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-emerald-600 underline font-medium">
        Política de Privacidade
      </a>
      {" "}(LGPD &amp; GDPR).{" "}
      <a href="/hipaa" target="_blank" rel="noopener noreferrer" className="text-emerald-600 underline font-medium">
        HIPAA Notice
      </a>
      {" "}·{" "}
      <a href="/cookies" target="_blank" rel="noopener noreferrer" className="text-emerald-600 underline font-medium">
        Cookies
      </a>
    </p>
  );
}
