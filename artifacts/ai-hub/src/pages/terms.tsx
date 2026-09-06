import { Link } from "wouter";
import { TherynIcon } from "@/components/nexus-icon";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen px-6 py-12 max-w-3xl mx-auto" style={{ background: "hsl(0 0% 4%)" }}>
      <div className="mb-8 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
      </div>

      <div className="flex items-center gap-3 mb-10">
        <TherynIcon size={32} />
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Terms of Service</h1>
          <p className="text-xs text-white/30 mt-0.5">Last updated: May 2025</p>
        </div>
      </div>

      <div className="space-y-8 text-sm text-white/60 leading-relaxed">
        {[
          {
            title: "1. Acceptance of Terms",
            body: "By accessing or using THERYN (\"the Service\"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service. Your continued use of THERYN constitutes your ongoing acceptance of these terms.",
          },
          {
            title: "2. Description of Service",
            body: "THERYN is an AI command center that provides access to multiple AI intelligence engines, custom agent creation, image generation, and voice synthesis capabilities. The Service is provided \"as is\" and we reserve the right to modify or discontinue any feature at any time.",
          },
          {
            title: "3. User Accounts",
            body: "You must maintain the confidentiality of your account credentials. You are responsible for all activity that occurs under your account. You must immediately notify us of any unauthorized use of your account. THERYN reserves the right to terminate accounts that violate these terms.",
          },
          {
            title: "4. Acceptable Use",
            body: "You agree not to use THERYN to generate harmful, illegal, misleading, or abusive content. You may not use the Service to violate any applicable law or regulation, infringe on intellectual property rights, distribute malware, or engage in unauthorized data collection. We reserve the right to remove content and suspend accounts that violate these policies.",
          },
          {
            title: "5. API Keys and Credentials",
            body: "Any API keys you provide to THERYN (such as third-party AI service keys) are stored securely and used solely to provide the requested services. You are responsible for the security of your credentials and any costs incurred through your connected accounts.",
          },
          {
            title: "6. Intellectual Property",
            body: "Content you create using THERYN remains yours. THERYN and its logos, branding, and underlying technology are proprietary to THERYN. You may not reproduce, modify, or distribute our proprietary content without express written permission.",
          },
          {
            title: "7. Limitation of Liability",
            body: "To the maximum extent permitted by law, THERYN shall not be liable for any indirect, incidental, special, consequential, or punitive damages. Our total liability for any claims under these terms shall not exceed the amount you paid us in the past twelve months.",
          },
          {
            title: "8. Changes to Terms",
            body: "We may update these Terms of Service from time to time. We will notify you of significant changes by updating the date at the top of this page. Continued use of the Service after changes constitutes acceptance of the new terms.",
          },
          {
            title: "9. Contact",
            body: "If you have questions about these Terms of Service, please contact us through the THERYN platform or visit our support center.",
          },
        ].map(section => (
          <section key={section.title}>
            <h2 className="text-base font-semibold text-white mb-2">{section.title}</h2>
            <p>{section.body}</p>
          </section>
        ))}
      </div>

      <div className="mt-12 pt-6 border-t border-white/[0.06] flex items-center justify-between">
        <Link href="/privacy" className="text-xs text-white/30 hover:text-white/60 transition-colors underline underline-offset-2">
          Privacy Policy →
        </Link>
        <Link href="/" className="text-xs text-red-400/70 hover:text-red-400 transition-colors">
          Back to THERYN
        </Link>
      </div>
    </div>
  );
}
