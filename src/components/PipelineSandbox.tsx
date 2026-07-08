import React, { useState, useMemo, useEffect } from 'react';
import { FormConfig, RoutingConfiguration, WorkspaceResources } from '../types';
import { sendGmailEmail, appendFeedbackToSheet } from '../services/googleWorkspace';
import {
  Inbox,
  Play,
  Mail,
  Table,
  CheckCircle,
  AlertOctagon,
  ArrowRight,
  TrendingDown,
  User,
  Star,
  CheckSquare,
  Sparkles,
  Info,
  Copy,
  ExternalLink
} from 'lucide-react';

// Dynamic suggested comments based on numeric star ratings to inspire users and test different branch routes
const RATING_SUGGESTIONS: Record<number, string[]> = {
  5: [
    "🛠️ M&K Auto Parts saved me lots of money by sourcing a premium used transmission from their yard and installing it for a fraction of what the dealership quoted.",
    "⚡ They fixed my car for literally half the price my regular mechanic quoted because they have all the parts right on-site.",
    "🔍 Their ASE-certified mechanics quickly diagnosed an electrical issue that two other local shops completely missed.",
    "🌍 They tracked down a rare engine component for me in less than 24 hours using their incredible nationwide parts-locating service."
  ],
  4: [
    "📦 After checking yards all over Florida, M&K was the only place that had the exact matching truck door panel I needed in stock.",
    "🤝 The mechanics here are incredibly trustworthy, explaining my brake issue clearly without trying to upsell me on unnecessary repairs.",
    "🚗 They hooked me up with a used tire that looked brand new and had me safely back on the road in under 45 minutes.",
    "⏱️ I dropped my car off in the morning and they sourced the rotors and finished my brake repair before lunch."
  ],
  3: [
    "💰 They gave me a fair cash offer over the phone for my old sedan and picked it up with a free tow truck the same afternoon.",
    "🚛 M&K made getting rid of my scrap car completely hassle-free by handling all the paperwork and providing fast, free towing.",
    "🔧 Found the part I needed, though it took a little longer to locate in the inventory tracker than expected."
  ],
  2: [
    "⚠️ Sourced the brake calipers okay, but the service queue was backed up and it took much longer than initially promised.",
    "🔧 Yard carries a huge collection, but the website's listed inventory status wasn't fully up-to-date with actual stock."
  ],
  1: [
    "🚨 Quoted one price on the phone, but when they arrived with the tow truck, they tried to pay less for my scrap car.",
    "❌ Part was labeled as tested and working, but was dead on arrival when my mechanic opened the box."
  ]
};

const isPublished = () => {
  try {
    const hostname = window.location.hostname;
    return hostname.includes('-pre-') || (!hostname.includes('-dev-') && hostname !== 'localhost' && hostname !== '127.0.0.1');
  } catch {
    return false;
  }
};

interface PipelineSandboxProps {
  token: string | null;
  resources: WorkspaceResources;
  routingConfig: RoutingConfiguration;
  onLogin?: () => void;
  isLoggingIn?: boolean;
  user?: any;
  onLogout?: () => void;
  isLivePreview?: boolean;
  authError?: string | null;
}

export default function PipelineSandbox({ 
  token, 
  resources, 
  routingConfig,
  onLogin,
  isLoggingIn,
  user,
  onLogout,
  isLivePreview = false,
  authError
}: PipelineSandboxProps) {
  const isCurrentlyPublished = isLivePreview || isPublished();

  // Shuffle array helper
  const shuffleArray = (array: string[]) => {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };

  // Generate randomized suggestions for the current session to ensure unique layout & selections
  const randomizedSuggestions = useMemo(() => {
    const result: Record<number, string[]> = {};
    Object.keys(RATING_SUGGESTIONS).forEach((key) => {
      const numKey = Number(key);
      result[numKey] = shuffleArray(RATING_SUGGESTIONS[numKey]);
    });
    return result;
  }, []);

  const [formData, setFormData] = useState<FormConfig>(() => {
    const initialRating = 5;

    return {
      name: 'Federico',
      email: 'theorangesnowman@gmail.com',
      rating: initialRating,
      comments: ''
    };
  });

  // Sync state with Google Auth user to autofill Name and Email instantly
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        name: user.displayName || prev.name,
        email: user.email || prev.email,
      }));
    }
  }, [user]);

  const [processedRoute, setProcessedRoute] = useState<string | null>(null);
  const [emailPreviewSubject, setEmailPreviewSubject] = useState('');
  const [emailPreviewBody, setEmailPreviewBody] = useState('');
  const [supportAlertTriggered, setSupportAlertTriggered] = useState(false);
  
  const [sheetLoading, setSheetLoading] = useState(false);
  const [sheetSuccess, setSheetSuccess] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [isAutoSubmitting, setIsAutoSubmitting] = useState(false);
  const [autoSubmitLogs, setAutoSubmitLogs] = useState<string[]>([]);
  const [hasSubmittedAuto, setHasSubmittedAuto] = useState(false);

  // Custom modal states to avoid iframe-hostile native dialog blocks
  const [showSheetConfirm, setShowSheetConfirm] = useState(false);
  const [showGmailModal, setShowGmailModal] = useState(false);
  const [testEmailRecipient, setTestEmailRecipient] = useState('');
  const [sendEscalationAlert, setSendEscalationAlert] = useState(false);
  const [gmailModalError, setGmailModalError] = useState<string | null>(null);

  const [isGeneratingSeo, setIsGeneratingSeo] = useState(false);
  const [showCopiedNotification, setShowCopiedNotification] = useState(false);

  const copyTextToClipboard = (text: string) => {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      return true;
    } catch (err) {
      console.warn("execCommand copy failed, falling back to navigator.clipboard:", err);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).catch(e => console.warn(e));
        return true;
      }
      return false;
    }
  };

  const handleCopyComments = () => {
    if (!formData.comments) return;
    copyTextToClipboard(formData.comments);
    setShowCopiedNotification(true);
    setTimeout(() => setShowCopiedNotification(false), 4400);
  };

  const formatExceptionMessage = (err: any) => {
    const msg = String(err.message || err);
    if (
      msg.toLowerCase().includes('authentication') ||
      msg.toLowerCase().includes('credential') ||
      msg.toLowerCase().includes('oauth') ||
      msg.toLowerCase().includes('unauthorized') ||
      msg.toLowerCase().includes('token') ||
      msg.includes('401')
    ) {
      return `${msg}. 💡 Help: Google Authorization is expired, missing, or needs fresh permissions! Click "Re-authorize Google" or "Connect Google Account" to refresh your token and accept permissions.`;
    }
    return msg;
  };

  const handleGenerateSeoSuggestion = async () => {
    setIsGeneratingSeo(true);
    setFeedbackError(null);
    setShowCopiedNotification(false);
    try {
      const response = await fetch('/api/suggest-seo-review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          rating: formData.rating,
          currentComments: formData.comments
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate SEO review suggestion.');
      }

      if (data.suggestion) {
        setFormData((prev) => ({
          ...prev,
          comments: data.suggestion,
        }));
        setValidationError(null);
        
        // The text is placed into the form field, and the user can copy/submit it with a clear single click
        setShowCopiedNotification(false);
      }
    } catch (err: any) {
      console.error(err);
      setFeedbackError(err.message || 'Error occurred while contacting Gemini AI.');
    } finally {
      setIsGeneratingSeo(false);
    }
  };

  // Parse HTML Body with name/comments replacements
  const parseBody = (template: string, rating: number) => {
    const firstName = formData.name ? formData.name.trim().split(/\s+/)[0] : '';
    return template
      .replace(/\${name}/g, firstName)
      .replace(/\${comments}/g, formData.comments || '(No comments provided)')
      .replace(/\${rating}/g, `${rating} Star${rating > 1 ? 's' : ''}`)
      .replace(/\${googleReviewsUrl}/g, routingConfig.googleReviewsUrl || 'https://g.page/r/CajrrF4R_V20EAI/review');
  };

  const handleSimulateRouting = () => {
    let subject = '';
    let body = '';
    let route = '';
    let alertSupport = false;

    if (formData.rating === 5) {
      route = 'Excellent (5-Star Branch)';
      subject = parseBody(routingConfig.excellentSubject, 5);
      body = parseBody(routingConfig.excellentBody, 5);
    } else if (formData.rating === 4) {
      route = 'Very Good (4-Star Branch)';
      subject = parseBody(routingConfig.goodSubject, 4);
      body = parseBody(routingConfig.goodBody, 4);
    } else if (formData.rating === 3) {
      route = 'Satisfactory (3-Star Branch)';
      subject = parseBody(routingConfig.neutralSubject, 3);
      body = parseBody(routingConfig.neutralBody, 3);
    } else {
      route = `Critical (1-2 Stars Branch)`;
      subject = parseBody(routingConfig.poorSubject, formData.rating);
      body = parseBody(routingConfig.poorBody, formData.rating);
      alertSupport = true;
    }

    setProcessedRoute(route);
    setEmailPreviewSubject(subject);
    setEmailPreviewBody(body);
    setSupportAlertTriggered(alertSupport);
    setSheetSuccess(false);
    setEmailSuccess(false);
    setFeedbackError(null);
  };

  const handleAutoSubmit = async () => {
    setIsAutoSubmitting(true);
    setHasSubmittedAuto(true);
    setAutoSubmitLogs([]);
    setFeedbackError(null);

    // 1. Calculate routes and email bodies first
    let subject = '';
    let body = '';
    let route = '';
    let alertSupport = false;

    if (formData.rating === 5) {
      route = 'Excellent (5-Star Branch)';
      subject = parseBody(routingConfig.excellentSubject, 5);
      body = parseBody(routingConfig.excellentBody, 5);
    } else if (formData.rating === 4) {
      route = 'Very Good (4-Star Branch)';
      subject = parseBody(routingConfig.goodSubject, 4);
      body = parseBody(routingConfig.goodBody, 4);
    } else if (formData.rating === 3) {
      route = 'Satisfactory (3-Star Branch)';
      subject = parseBody(routingConfig.neutralSubject, 3);
      body = parseBody(routingConfig.neutralBody, 3);
    } else {
      route = `Critical (1-2 Stars Branch)`;
      subject = parseBody(routingConfig.poorSubject, formData.rating);
      body = parseBody(routingConfig.poorBody, formData.rating);
      alertSupport = true;
    }

    setProcessedRoute(route);
    setEmailPreviewSubject(subject);
    setEmailPreviewBody(body);
    setSupportAlertTriggered(alertSupport);

    const logs: string[] = [];

    // A. Record to Sheet
    if (token) {
      if (resources.spreadsheetId) {
        try {
          logs.push(`📝 Appending row to Sheet: "${formData.name}", ${formData.rating} Stars...`);
          setAutoSubmitLogs([...logs]);
          await appendFeedbackToSheet(
            token,
            resources.spreadsheetId,
            formData.name,
            formData.email,
            formData.rating,
            formData.comments
          );
          logs.push(`✅ Successfully recorded feedback row to Google Sheet.`);
          setSheetSuccess(true);
          setAutoSubmitLogs([...logs]);
        } catch (err: any) {
          const prettyErr = formatExceptionMessage(err);
          logs.push(`⚠️ Failed writing to Google Sheet: ${prettyErr}`);
          setAutoSubmitLogs([...logs]);
          setFeedbackError(`Sheet Append Error: ${prettyErr}`);
        }
      } else {
        logs.push(`ℹ️ Google Sheet database is offline. Skipping row record.`);
        setAutoSubmitLogs([...logs]);
      }

      // B. Send Gmail Responder
      try {
        const ccEmail = routingConfig.supportEmail;
        logs.push(`✉️ Routing response to client address: ${formData.email}${ccEmail ? ` (CC: ${ccEmail})` : ''}...`);
        setAutoSubmitLogs([...logs]);
        await sendGmailEmail(token, formData.email, subject, body, ccEmail);
        logs.push(`✅ Auto-responder Gmail sent successfully.`);
        setEmailSuccess(true);
        setAutoSubmitLogs([...logs]);

        // C. If poor rating, send escalation alert
        if (alertSupport && routingConfig.supportEmail) {
          logs.push(`🚨 Escalating notification email to support: ${routingConfig.supportEmail}...`);
          setAutoSubmitLogs([...logs]);
          const alertBody = `⚠️ URGENT ESCALATION: Negative Feedback received from ${formData.name}. Ratings: ${formData.rating} Stars. Comments: ${formData.comments}`;
          await sendGmailEmail(token, routingConfig.supportEmail, '⚠️ URGENT ESCALATION: Poor customer feedback', alertBody);
          logs.push(`✅ Escalation alert dispatched successfully.`);
          setAutoSubmitLogs([...logs]);
        }
      } catch (err: any) {
        const prettyErr = formatExceptionMessage(err);
        logs.push(`⚠️ Failed sending response email: ${prettyErr}`);
        setAutoSubmitLogs([...logs]);
        setFeedbackError((prev) => prev ? `${prev} | Email Error: ${prettyErr}` : `Email Error: ${prettyErr}`);
      }
    } else {
      // No token
      logs.push(`ℹ️ Live routing completed locally. To write to spreadsheets and send live Gmail emails, click 'Connect Google Account' above.`);
      setAutoSubmitLogs([...logs]);
    }

    setIsAutoSubmitting(false);
  };

  const handleSubmitClick = () => {
    if (!formData.comments || !formData.comments.trim()) {
      setValidationError("Please share your feedback or experience in the comments section before submitting.");
      return;
    }
    setValidationError(null);

    if (isCurrentlyPublished) {
      if (formData.rating >= 4) {
        if (formData.comments) {
          copyTextToClipboard(formData.comments);
        }
        try {
          const reviewUrl = routingConfig.googleReviewsUrl || "https://g.page/r/CajrrF4R_V20EAI/review";
          const win = window.open(reviewUrl, '_blank');
          if (win) {
            win.focus();
          }
        } catch (e) {
          console.warn("Direct navigation / popup was blocked by browser:", e);
        }
      }
      handleAutoSubmit();
    } else {
      handleSimulateRouting();
    }
  };

  const triggerAppendToRealSheet = () => {
    if (!token || !resources.spreadsheetId) return;
    setShowSheetConfirm(true);
  };

  const handleAppendToRealSheet = async () => {
    setShowSheetConfirm(false);
    setSheetLoading(true);
    setFeedbackError(null);
    try {
      await appendFeedbackToSheet(
        token!,
        resources.spreadsheetId!,
        formData.name,
        formData.email,
        formData.rating,
        formData.comments
      );
      setSheetSuccess(true);
      setTimeout(() => setSheetSuccess(false), 4000);
    } catch (err: any) {
      const prettyErr = formatExceptionMessage(err);
      setFeedbackError(prettyErr);
    } finally {
      setSheetLoading(false);
    }
  };

  const triggerSendTestGmail = () => {
    if (!token) return;
    setTestEmailRecipient(formData.email);
    setSendEscalationAlert(supportAlertTriggered);
    setGmailModalError(null);
    setShowGmailModal(true);
  };

  const handleSendTestGmail = async () => {
    setEmailLoading(true);
    setGmailModalError(null);
    setFeedbackError(null);
    try {
      await sendGmailEmail(token!, testEmailRecipient, emailPreviewSubject, emailPreviewBody);
      
      // If critical, optionally simulate support alert too
      if (sendEscalationAlert) {
        const alertBody = `⚠️ URGENT ESCALATION: Negative Feedback received from ${formData.name}. Ratings: ${formData.rating} Stars. Comments: ${formData.comments}`;
        await sendGmailEmail(token!, routingConfig.supportEmail, '⚠️ URGENT ESCALATION: Poor customer feedback', alertBody);
      }

      setEmailSuccess(true);
      setShowGmailModal(false);
      setTimeout(() => setEmailSuccess(false), 4000);
    } catch (err: any) {
      const prettyErr = formatExceptionMessage(err);
      setGmailModalError(prettyErr);
      setFeedbackError(prettyErr);
    } finally {
      setEmailLoading(false);
    }
  };

  const showRightColumn = !isCurrentlyPublished;

  return (
    <div className={isCurrentlyPublished ? "bg-white p-0 border-none" : "bg-slate-50/50 rounded-3xl border border-slate-100 p-6 lg:p-8"} id="sandbox-section">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Dynamic Simulator Inputs */}
        <div className={showRightColumn ? "lg:col-span-5 space-y-6" : "lg:col-span-12 max-w-2xl mx-auto space-y-6 w-full"}>
          {isCurrentlyPublished && hasSubmittedAuto ? (
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm text-center space-y-5" id="published-congrats-card">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8" />
              </div>
              <div className="space-y-3">
                <h3 className="text-xl font-bold text-slate-950">Thank you, {formData.name || 'Federico'}!</h3>
                <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                  {formData.rating >= 4 
                    ? "We have successfully recorded your feedback and opened our Google Review page in a new window/tab. In case it didn't open automatically, please click below." 
                    : "We appreciate your feedback and are looking into how we can improve. Our support desk has been notified."}
                </p>
                {formData.rating >= 4 && formData.comments && (
                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl max-w-sm mx-auto text-left space-y-1.5 shadow-2xs">
                    <p className="text-[11px] font-bold text-amber-850 flex items-center gap-1">
                      <span>📋 Review comments copied!</span>
                    </p>
                    <p className="text-[11px] text-amber-705 italic line-clamp-2">"{formData.comments}"</p>
                    <p className="text-[10px] text-slate-400 font-medium">Just right-click and paste it on the Google form!</p>
                  </div>
                )}
              </div>

              {formData.rating >= 4 && (
                <div className="pt-2">
                  <a
                    href={routingConfig.googleReviewsUrl || "https://g.page/r/CajrrF4R_V20EAI/review"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-[#dc2626] hover:bg-[#b91c1c] text-white rounded-xl text-sm font-bold shadow-md cursor-pointer transition-all duration-150 active:scale-98"
                    id="published-submit-review-btn"
                  >
                    <Sparkles className="w-4 h-4 text-white" />
                    <span>Open Google Review Page</span>
                  </a>
                </div>
              )}
            </div>
          ) : (
            <div className={isCurrentlyPublished ? "bg-white p-0 space-y-6" : "bg-white rounded-2xl border border-slate-100 p-6 shadow-xs"}>
              
              {!isCurrentlyPublished && (
                // Original Input Simulator header block for development mode
                <div className="mb-5">
                  <h3 className="font-semibold text-slate-900 text-lg">Input Simulator</h3>
                </div>
              )}

              <div className="space-y-4">
              {user ? (
                /* Google reviewer identity badge card */
                <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between gap-3 shadow-xs" id="review-identity-card">
                  <div className="flex items-center gap-3">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt="" className="w-9 h-9 rounded-full border border-slate-200" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-slate-250 flex items-center justify-center font-bold text-slate-700 text-sm">
                        {(user.displayName || user.email || 'G').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="text-left">
                      <p className="text-xs font-bold text-slate-900 leading-none">Reviewing as {user.displayName || 'Google User'}</p>
                      <p className="text-[10.5px] font-medium text-slate-400 mt-1">{user.email}</p>
                    </div>
                  </div>
                  {onLogout && (
                    <button
                      type="button"
                      onClick={onLogout}
                      className="text-[10px] font-bold text-red-650 hover:text-red-750 hover:underline transition-colors cursor-pointer"
                      id="live-form-disconnect-btn"
                    >
                      Disconnect
                    </button>
                  )}
                </div>
              ) : (
                /* Only Connect with Google option styled as requested */
                <>
                  {onLogin && (
                    <div id="live-form-google-signin-wrapper">
                      <button
                        type="button"
                        onClick={onLogin}
                        disabled={isLoggingIn}
                        className="w-full flex items-center justify-center gap-2.5 px-4 py-3 bg-yellow-400 hover:bg-yellow-500 border border-transparent text-slate-900 rounded-xl text-xs font-bold shadow-2xs transition-all duration-150 cursor-pointer active:scale-98"
                        id="live-form-google-signin-btn"
                      >
                        {isLoggingIn ? (
                          <div className="w-3.5 h-3.5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4.5 h-4.5 shrink-0">
                            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                          </svg>
                        )}
                        <span>Connect with Google</span>
                      </button>
                    </div>
                  )}
                  {authError && (
                    <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-xs font-semibold rounded-xl leading-relaxed mt-2" id="sandbox-auth-error">
                      ⚠️ {authError}
                    </div>
                  )}
                </>
              )}

              <div>
                <label className="block text-xs font-bold text-black mb-2">Star Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => {
                        const nextComments = star < 4 ? '' : formData.comments;
                        setFormData({ ...formData, rating: star, comments: nextComments });
                        setValidationError(null);
                      }}
                      className="p-1 transition-transform active:scale-95 cursor-pointer"
                      id={`star-${star}-btn`}
                    >
                      <Star
                        className={`w-8 h-8 ${
                          star <= formData.rating
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-slate-200 hover:text-amber-200'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2">
                  <label className="block text-xs font-bold text-black">Comments</label>
                </div>
                <textarea
                  value={formData.comments}
                  onChange={(e) => {
                    setFormData({ ...formData, comments: e.target.value });
                    if (validationError) {
                      setValidationError(null);
                    }
                  }}
                  rows={3}
                  className={`w-full text-sm px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-red-100 font-medium text-slate-800 ${
                    validationError ? 'border-red-500 focus:ring-red-500 bg-red-50/20' : 'border-slate-400'
                  }`}
                  id="sim-comments-input"
                  placeholder="Share details here..."
                ></textarea>

                {validationError && (
                  <p className="text-red-600 text-xs font-semibold mt-1.5 flex items-center gap-1.5" id="comments-validation-error">
                    <span className="shrink-0">⚠️</span>
                    <span>{validationError}</span>
                  </p>
                )}

                {formData.rating >= 4 && (
                  <div className="flex flex-col items-start gap-1.5 mt-3">
                    <button
                      type="button"
                      onClick={handleGenerateSeoSuggestion}
                      disabled={isGeneratingSeo}
                      className="text-[10px] sm:text-[11px] font-bold text-black bg-yellow-400 hover:bg-black hover:text-white disabled:bg-slate-200 disabled:text-slate-400 flex items-center justify-center gap-1.5 transition-all py-1.5 px-3 rounded-lg active:scale-95 cursor-pointer disabled:pointer-events-none shadow-xs self-start"
                      id="ai-seo-suggest-btn"
                    >
                      {isGeneratingSeo ? (
                        <>
                          <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0"></div>
                          <span>Improving with AI...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-current shrink-0" />
                          <span>Improve with AI</span>
                        </>
                      )}
                    </button>
                    <span className="text-[11px] text-slate-950 font-medium leading-normal">
                      Click again for a new version, feel free to edit.
                    </span>
                  </div>
                )}

                {formData.rating >= 4 ? (
                  formData.comments && (
                    <div className="mt-3 p-4 bg-red-50/45 border-2 border-red-200 rounded-2xl space-y-3" id="high-rating-route-callout">
                      <div 
                        onClick={() => {
                          try {
                            copyTextToClipboard(formData.comments);
                            setShowCopiedNotification(true);
                            setTimeout(() => setShowCopiedNotification(false), 4400);
                            
                            // Automatically record to Google Sheet as well!
                            if (token && resources.spreadsheetId) {
                              handleAppendToRealSheet();
                            }

                            const win = window.open(routingConfig.googleReviewsUrl || 'https://g.page/r/CajrrF4R_V20EAI/review', '_blank');
                            if (win) win.focus();
                          } catch (err) {
                            console.error('Failed to copy and open directory link:', err);
                          }
                        }}
                        className="bg-white border border-slate-100 hover:border-red-200 hover:shadow-xs cursor-pointer active:scale-[0.99] rounded-xl p-3 text-xs space-y-1.5 shadow-3xs transition-all"
                        title="Click to copy and open Google Directory"
                        id="ready-to-paste-card"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-750 flex items-center gap-1">
                            <span>Ready to paste!</span>
                            <span className="text-[10px] text-slate-400 font-normal">(Click to copy & open Directory)</span>
                          </span>
                          <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                            {showCopiedNotification ? "✓ Copied!" : "Ready"}
                          </span>
                        </div>
                        <p className="italic text-slate-650 border-l-2 border-red-500 pl-2 py-0.5 break-words font-medium">{formData.comments}</p>
                      </div>

                      <div className="text-center pt-1">
                        <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg inline-block">
                          ✨ 4 & 5-Star reviews are recorded to the sheet automatically!
                        </span>
                      </div>
                    </div>
                  )
                ) : (
                  formData.comments && (
                    <div className={`mt-2 p-3 rounded-xl border transition-all duration-300 text-xs flex flex-col gap-2 ${
                      showCopiedNotification 
                        ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
                        : 'bg-red-50/30 border-red-100 text-slate-705'
                    }`} id="copy-info-bubble">
                      <div className="flex items-start gap-2">
                        {showCopiedNotification ? (
                          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        ) : (
                          <Info className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 font-medium text-slate-700">
                          {showCopiedNotification ? (
                            <span><strong>Review copied to clipboard!</strong> Copy and paste it anywhere!</span>
                          ) : (
                            <span>Copy and paste it anywhere!</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-slate-100">
                        <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                          {showCopiedNotification ? "✓ Copied to Clipboard" : "📋 Status: Ready"}
                        </span>
                        <button
                          type="button"
                          onClick={handleCopyComments}
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer active:scale-95 ${
                            showCopiedNotification
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              : 'bg-red-600 hover:bg-red-700 text-white'
                          }`}
                          id="manual-copy-comments-btn"
                        >
                          <Copy className="w-3 h-3" />
                          <span>{showCopiedNotification ? "Copy Again" : "Copy to Clipboard"}</span>
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>

              <button
                onClick={handleSubmitClick}
                disabled={isAutoSubmitting}
                className="w-full py-3 bg-red-650 hover:bg-red-750 disabled:bg-slate-300 disabled:text-slate-500 text-white rounded-xl text-sm font-bold shadow-xs active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
                id="run-sim-btn"
              >
                {isAutoSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0"></div>
                ) : (
                  <Sparkles className="w-4 h-4 text-white shrink-0" />
                )}
                <span>{isCurrentlyPublished ? "Submit Feedback" : "Simulate"}</span>
              </button>
            </div>
          </div>
          )}

          {feedbackError && (
            <div className="p-4 bg-rose-50 border border-rose-100 text-rose-800 rounded-xl text-xs space-y-2">
              <div className="flex items-center gap-2">
                <AlertOctagon className="w-4.5 h-4.5 shrink-0 text-red-600" />
                <span className="font-semibold">{feedbackError}</span>
              </div>
              {(feedbackError.toLowerCase().includes('authorization') || 
                feedbackError.toLowerCase().includes('credential') || 
                feedbackError.toLowerCase().includes('oauth') || 
                feedbackError.toLowerCase().includes('unauthorized') || 
                feedbackError.toLowerCase().includes('token') || 
                feedbackError.includes('401')) && onLogin && (
                <div className="pt-1.5 pl-6">
                  <button
                    type="button"
                    onClick={onLogin}
                    disabled={isLoggingIn}
                    className="text-[11px] font-bold px-3 py-1.5 bg-red-650 hover:bg-red-750 text-white rounded-lg transition-all duration-150 cursor-pointer flex items-center gap-1.5 shadow-3xs"
                    id="sandbox-error-auth-fix-btn"
                  >
                    {isLoggingIn && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                    <span>Connect/Re-authorize Google Account</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Dynamic Inbox Preview & Live execution details */}
        {showRightColumn && (
          <div className="lg:col-span-7 flex flex-col">
            {processedRoute ? (
              <div className="space-y-6 flex-1 flex flex-col justify-between">
                
              {/* Simulated Mailbox Client */}
              <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden flex-1 flex flex-col">
                <div className="px-4.5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center gap-2 text-slate-200">
                  <Inbox className="w-4 h-4 text-red-500" />
                  <span className="text-xs font-bold font-sans tracking-wide">Simulated Mail Dispatch Inbox</span>
                </div>

                <div className="p-4.5 space-y-3.5 flex-1 overflow-y-auto">
                  <div className="grid grid-cols-12 gap-2 text-xs border-b border-slate-800/60 pb-3">
                    <span className="col-span-2 font-medium text-slate-400">Subject:</span>
                    <span className="col-span-10 font-bold text-slate-100">{emailPreviewSubject}</span>
                  </div>

                  <div className="grid grid-cols-12 gap-2 text-xs border-b border-slate-800/60 pb-3">
                    <span className="col-span-2 font-medium text-slate-400">To:</span>
                    <span className="col-span-10 font-mono text-red-400 font-semibold">{formData.email}</span>
                  </div>

                  {/* Rendered HTML Container */}
                  <div className="p-3 border border-slate-800/80 rounded-xl bg-slate-950/70 max-h-[300px] overflow-y-auto shadow-inner text-slate-300 text-xs text-left">
                    <div dangerouslySetInnerHTML={{ __html: emailPreviewBody }}></div>
                  </div>
                </div>

                {/* Actions Section */}
                {isCurrentlyPublished ? (
                  <div className="p-4 bg-slate-950 border-t border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10.5px] uppercase font-bold tracking-wider text-slate-400">Automated Pipeline Execution Logs</span>
                      <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-955">Active</span>
                    </div>
                    <div className="font-mono text-[11px] text-slate-300 space-y-1.5 max-h-[140px] overflow-y-auto bg-slate-900 border border-slate-800 p-2.5 rounded-xl">
                      {autoSubmitLogs.length > 0 ? (
                        autoSubmitLogs.map((log, idx) => (
                          <div key={idx} className="leading-normal">{log}</div>
                        ))
                      ) : (
                        <div className="text-slate-500 italic text-xs">Waiting for feedback submission...</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-950 border-t border-slate-800/80 grid grid-cols-2 gap-4">
                    {/* Append Sheet Action */}
                    <button
                      onClick={triggerAppendToRealSheet}
                      disabled={sheetLoading || !token || !resources.spreadsheetId}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white disabled:text-slate-400 rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                      id="append-sheet-btn"
                    >
                      <Table className="w-3.5 h-3.5" />
                      {sheetLoading ? (
                        <span>Running pipeline...</span>
                      ) : sheetSuccess ? (
                        <span className="text-emerald-100 inline-flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> Checked in!
                        </span>
                      ) : (
                        <span>Record to Sheet</span>
                      )}
                    </button>

                    {/* Mail sending via custom API */}
                    <button
                      onClick={triggerSendTestGmail}
                      disabled={emailLoading || !token}
                      className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-750 disabled:bg-slate-200 text-white disabled:text-slate-400 rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                      id="send-gmail-btn"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      {emailLoading ? (
                        <span>Sending message...</span>
                      ) : emailSuccess ? (
                        <span className="text-red-100 inline-flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> Email Sent!
                        </span>
                      ) : (
                        <span>Send Real Test Email</span>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {!isCurrentlyPublished && !resources.spreadsheetId && (
                <div className="p-3.5 bg-yellow-50 text-yellow-800 border border-yellow-100 rounded-xl flex items-start gap-2 text-[11px] leading-relaxed">
                  <Info className="w-4 h-4 text-yellow-600 shrink-0 mt-0.5" />
                  <span>
                     <strong>Spreadsheet offline:</strong> Deployed resource records are only unlocked once you deploy the Google Sheet from the first tab! Standard sandbox mail simulation will work immediately.
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-slate-200 bg-slate-50/50 rounded-2xl p-8 text-center min-h-[300px]">
              <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center mb-3">
                <Inbox className="w-6 h-6 text-red-400" />
              </div>
              <h4 className="font-semibold text-slate-800 text-sm">
                {isCurrentlyPublished ? "Feedback Transmission Desk" : "Visual Sandboxed Sandbox"}
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
                {isCurrentlyPublished 
                  ? "Configure the customer details on the left, then click 'Submit Feedback' to trigger database recording and live email dispatch routes instantly."
                  : 'Configure your mock customer details on the left, then click "Simulate" to trace email routing.'}
              </p>
            </div>
          )}
        </div>
        )}
      </div>

      {/* Modal sheet confirmation */}
      {showSheetConfirm && (
        <div className="fixed inset-0 z-50 overflow-y-auto" id="sheet-confirm-modal">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" onClick={() => setShowSheetConfirm(false)}></div>
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <div className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-md border border-slate-100">
              <div className="bg-white p-6">
                <div className="text-center sm:text-left">
                  <h3 className="text-base font-bold leading-6 text-slate-900 flex items-center gap-2">
                    <Table className="w-5 h-5 text-emerald-600" />
                    Append Feedback Record?
                  </h3>
                  <div className="mt-3 text-xs text-slate-500 space-y-2.5 leading-relaxed">
                    <p>
                      This will write a new live row into the <strong>"Form Responses 1"</strong> sheet of your deployed Google Spreadsheet:
                    </p>
                    <div className="p-2 border border-slate-100 bg-slate-50 rounded-lg text-[11px] font-mono select-all">
                      ID: {resources.spreadsheetId}
                    </div>
                    <p>
                      The payload matches your current simulator values:
                    </p>
                    <div className="border border-slate-100 rounded-xl overflow-hidden text-[11px]">
                      <div className="grid grid-cols-3 border-b border-slate-100 bg-slate-50 px-3 py-1 font-semibold text-slate-600">
                        <span>Param</span>
                        <span className="col-span-2">Value</span>
                      </div>
                      <div className="px-3 py-1.5 space-y-1 bg-white">
                        <div className="grid grid-cols-3 text-slate-600"><span className="font-medium">Name:</span><span className="col-span-2 font-mono">{formData.name}</span></div>
                        <div className="grid grid-cols-3 text-slate-600"><span className="font-medium">Email:</span><span className="col-span-2 font-mono">{formData.email}</span></div>
                        <div className="grid grid-cols-3 text-slate-600"><span className="font-medium">Rating:</span><span className="col-span-2 text-red-600 font-bold">{formData.rating} Stars</span></div>
                        <div className="grid grid-cols-3 text-slate-600"><span className="font-medium">Comments:</span><span className="col-span-2 italic text-slate-500 truncate">{formData.comments || '(No comments)'}</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-slate-50 px-6 py-4 sm:flex sm:flex-row-reverse sm:gap-3 rounded-b-2xl">
                <button
                  type="button"
                  onClick={handleAppendToRealSheet}
                  className="inline-flex w-full justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 sm:w-auto cursor-pointer"
                  id="execute-sheet-btn"
                >
                  Write to Sheet
                </button>
                <button
                  type="button"
                  onClick={() => setShowSheetConfirm(false)}
                  className="mt-3 inline-flex w-full justify-center rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-xs ring-1 ring-inset ring-slate-200 hover:bg-slate-50 sm:mt-0 sm:w-auto cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal gmail config */}
      {showGmailModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto" id="gmail-confirm-modal">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" onClick={() => !emailLoading && setShowGmailModal(false)}></div>
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <div className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-md border border-slate-100">
              <div className="bg-white p-6">
                <div>
                  <h3 className="text-base font-bold leading-6 text-slate-900 flex items-center gap-2 mb-3">
                    <Mail className="w-5 h-5 text-red-600" />
                    Test Gmail Workspace Dispatch
                  </h3>
                  
                  {gmailModalError && (
                    <div className="mb-4 p-3 bg-rose-50 border border-rose-100/80 rounded-xl text-rose-800 text-xs space-y-1.5">
                      <div className="font-bold flex items-center gap-1.5 text-rose-950">
                        <AlertOctagon className="w-4 h-4 shrink-0 text-rose-600" />
                        <span>Dispatch Error Occurred</span>
                      </div>
                      <p className="leading-relaxed break-words font-mono text-[10.5px] bg-white/50 p-2 rounded-md border border-rose-100/50 max-h-[120px] overflow-y-auto">{gmailModalError}</p>
                      
                      {(gmailModalError.toLowerCase().includes('authorization') || 
                        gmailModalError.toLowerCase().includes('credential') || 
                        gmailModalError.toLowerCase().includes('oauth') || 
                        gmailModalError.toLowerCase().includes('unauthorized') || 
                        gmailModalError.toLowerCase().includes('token') || 
                        gmailModalError.includes('401')) && onLogin && (
                        <div className="pt-1.5">
                          <button
                            type="button"
                            onClick={onLogin}
                            disabled={isLoggingIn}
                            className="w-full text-[10px] sm:text-[11px] font-bold px-3 py-1.5 bg-red-650 hover:bg-red-750 text-white rounded-lg transition-all duration-150 cursor-pointer flex items-center justify-center gap-1.5 shadow-3xs"
                            id="modal-error-auth-fix-btn"
                          >
                            {isLoggingIn && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                            <span>Connect/Re-authorize Google Account</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">
                        Recipient Address *
                      </label>
                      <input
                        type="email"
                        value={testEmailRecipient}
                        onChange={(e) => setTestEmailRecipient(e.target.value)}
                        disabled={emailLoading}
                        className="w-full text-xs px-3.5 py-2.5 border border-slate-400 rounded-xl focus:ring-2 focus:ring-red-100 focus:outline-hidden font-medium text-slate-800 disabled:bg-slate-50 disabled:text-slate-400"
                        required
                        id="test-recipient-input"
                      />
                      <span className="text-[10px] text-slate-400 block mt-1">
                        Specify the test destination. This will send a standard email using your authenticated credentials.
                      </span>
                    </div>

                    {supportAlertTriggered && (
                      <div className="p-3 border border-yellow-100 bg-yellow-50/50 rounded-xl space-y-2">
                        <div className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            id="send-escalation-check"
                            checked={sendEscalationAlert}
                            disabled={emailLoading}
                            onChange={(e) => setSendEscalationAlert(e.target.checked)}
                            className="mt-1 shrink-0 rounded-sm accent-amber-600"
                          />
                          <label htmlFor="send-escalation-check" className="text-[11px] text-amber-900 font-semibold leading-normal cursor-pointer select-none">
                            Escalate poor response alert to Support Team
                          </label>
                        </div>
                        <p className="text-[10px] text-amber-700 leading-normal pl-5">
                          If selected, we will also route the critical alert email immediately to your support mailbox: <strong className="font-mono">{routingConfig.supportEmail}</strong>.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="bg-slate-50 px-6 py-4 sm:flex sm:flex-row-reverse sm:gap-3 rounded-b-2xl">
                <button
                  type="button"
                  onClick={handleSendTestGmail}
                  disabled={!testEmailRecipient || emailLoading}
                  className="inline-flex w-full justify-center rounded-xl bg-red-650 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-red-750 disabled:bg-slate-200 disabled:text-slate-400 sm:w-auto cursor-pointer flex items-center justify-center gap-2"
                  id="execute-gmail-btn"
                >
                  {emailLoading && (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  )}
                  <span>{emailLoading ? 'Sending Now...' : 'Send Live Email(s)'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowGmailModal(false)}
                  disabled={emailLoading}
                  className="mt-3 inline-flex w-full justify-center rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-xs ring-1 ring-inset ring-slate-200 hover:bg-slate-50 sm:mt-0 sm:w-auto cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
