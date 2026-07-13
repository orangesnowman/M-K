import React, { useState, useMemo, useEffect } from 'react';
import { FormConfig, RoutingConfiguration, WorkspaceResources } from '../types';
import { sendGmailEmail, appendFeedbackToSheet } from '../services/googleWorkspace';
import mkLogo from '../assets/images/mk_logo_1781902335896.jpg';
import pixelRobotHeart from '../assets/images/pixel_robot_heart_1783882654344.jpg';
import {
  Inbox,
  Play,
  Mail,
  Table,
  CheckCircle,
  Check,
  AlertOctagon,
  ArrowRight,
  TrendingDown,
  User,
  Star,
  CheckSquare,
  Sparkles,
  Info,
  Copy,
  ExternalLink,
  Facebook,
  Share2
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
  const [visitedPlatforms, setVisitedPlatforms] = useState<string[]>([]);
  const [hasFinishedSharing, setHasFinishedSharing] = useState(false);

  // Custom modal states to avoid iframe-hostile native dialog blocks
  const [showSheetConfirm, setShowSheetConfirm] = useState(false);
  const [showGmailModal, setShowGmailModal] = useState(false);
  const [testEmailRecipient, setTestEmailRecipient] = useState('');
  const [sendEscalationAlert, setSendEscalationAlert] = useState(false);
  const [gmailModalError, setGmailModalError] = useState<string | null>(null);

  const [isGeneratingSeo, setIsGeneratingSeo] = useState(false);
  const [showCopiedNotification, setShowCopiedNotification] = useState(false);
  const [showAiCopiedBanner, setShowAiCopiedBanner] = useState(false);

  const [fixTogether, setFixTogether] = useState(true);

  // Enabled platforms based on settings
  const enabledPlatforms = useMemo(() => {
    const list: { name: string; url: string; color: string; hoverColor: string }[] = [];
    if (routingConfig.facebookEnabled && routingConfig.facebookUrl) {
      list.push({ 
        name: 'Facebook', 
        url: routingConfig.facebookUrl, 
        color: 'bg-[#1877f2]', 
        hoverColor: 'hover:bg-[#115bc5]' 
      });
    }
    if (routingConfig.yelpEnabled && routingConfig.yelpUrl) {
      list.push({ 
        name: 'Yelp', 
        url: routingConfig.yelpUrl, 
        color: 'bg-[#d32323]', 
        hoverColor: 'hover:bg-[#b01d1d]' 
      });
    }
    if (routingConfig.bbbEnabled && routingConfig.bbbUrl) {
      list.push({ 
        name: 'BBB', 
        url: routingConfig.bbbUrl, 
        color: 'bg-[#005187]', 
        hoverColor: 'hover:bg-[#003d66]' 
      });
    }
    return list;
  }, [routingConfig]);

  // Remaining platforms to share on
  const remainingPlatforms = useMemo(() => {
    return enabledPlatforms.filter(p => !visitedPlatforms.includes(p.name));
  }, [enabledPlatforms, visitedPlatforms]);

  const handleSharePlatformClick = (platform: { name: string; url: string }) => {
    try {
      const win = window.open(platform.url, '_blank');
      if (win) {
        win.focus();
      }
    } catch (e) {
      console.warn("Popup blocked by browser:", e);
    }
    setVisitedPlatforms(prev => [...prev, platform.name]);
  };

  const getEffectiveComments = () => {
    const threshold = routingConfig.starThreshold ?? 3;
    if (formData.rating <= threshold && fixTogether) {
      if (formData.comments && formData.comments.trim()) {
        return `${formData.comments.trim()}\n\nLet's try to fix this together`;
      }
      return "";
    }
    return formData.comments;
  };

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
    const lower = msg.toLowerCase();
    if (
      lower.includes('authentication') ||
      lower.includes('credential') ||
      lower.includes('oauth') ||
      lower.includes('unauthorized') ||
      lower.includes('token') ||
      msg.includes('401')
    ) {
      return `${msg}. 💡 Help: Google Authorization is expired, missing, or needs fresh permissions! Click "Re-authorize Google" or "Connect Google Account" to refresh your token and accept permissions.`;
    }
    if (
      lower.includes('403') ||
      lower.includes('permission') ||
      lower.includes('forbidden')
    ) {
      return `${msg}. 💡 Help: You do not have edit permissions for this spreadsheet. If you are using the default template sheet, please click on the "Sheet Feedback" tab and click "Deploy Workflow" or "Re-authorize & Setup" to automatically provision a brand-new personal spreadsheet inside your own Google Drive!`;
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

        // Copy the newly generated AI suggestion directly to clipboard & display under "Click again..."
        copyTextToClipboard(data.suggestion);
        setShowAiCopiedBanner(true);
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
      .replace(/\${comments}/g, getEffectiveComments() || '(No comments provided)')
      .replace(/\${rating}/g, `${rating} Star${rating > 1 ? 's' : ''}`)
      .replace(/\${googleReviewsUrl}/g, routingConfig.googleReviewsUrl || 'https://g.page/r/CajrrF4R_V20EAI/review');
  };

  const handleSimulateRouting = () => {
    let subject = '';
    let body = '';
    let route = '';
    let alertSupport = false;

    const threshold = routingConfig.starThreshold ?? 3;
    const isPositive = formData.rating > threshold;

    if (isPositive) {
      if (formData.rating === 5) {
        route = 'Excellent (5-Star Branch)';
        subject = parseBody(routingConfig.excellentSubject, 5);
        body = parseBody(routingConfig.excellentBody, 5);
      } else if (formData.rating === 4) {
        route = 'Very Good (4-Star Branch)';
        subject = parseBody(routingConfig.goodSubject, 4);
        body = parseBody(routingConfig.goodBody, 4);
      } else {
        route = 'Neutral (3-Star Branch)';
        subject = parseBody(routingConfig.neutralSubject, 3);
        body = parseBody(routingConfig.neutralBody, 3);
      }
    } else {
      route = `Direct Feedback / Escalation Branch (${formData.rating} Stars)`;
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

    const threshold = routingConfig.starThreshold ?? 3;
    const isPositive = formData.rating > threshold;

    if (isPositive) {
      if (formData.rating === 5) {
        route = 'Excellent (5-Star Branch)';
        subject = parseBody(routingConfig.excellentSubject, 5);
        body = parseBody(routingConfig.excellentBody, 5);
      } else if (formData.rating === 4) {
        route = 'Very Good (4-Star Branch)';
        subject = parseBody(routingConfig.goodSubject, 4);
        body = parseBody(routingConfig.goodBody, 4);
      } else {
        route = 'Neutral (3-Star Branch)';
        subject = parseBody(routingConfig.neutralSubject, 3);
        body = parseBody(routingConfig.neutralBody, 3);
      }
    } else {
      route = `Direct Feedback / Escalation Branch (${formData.rating} Stars)`;
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
            getEffectiveComments()
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
          const alertBody = `⚠️ URGENT ESCALATION: Negative Feedback received from ${formData.name}. Ratings: ${formData.rating} Stars. Comments: ${getEffectiveComments()}`;
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
    const effectiveComments = getEffectiveComments();
    if (!effectiveComments || !effectiveComments.trim()) {
      setValidationError("You must fill out the review.");
      return;
    }
    setValidationError(null);

    // Reset sharing states for a fresh submission
    setVisitedPlatforms([]);
    setHasFinishedSharing(false);

    const threshold = routingConfig.starThreshold ?? 3;
    const isPositive = formData.rating > threshold;

    // Automatically copy the review to clipboard when rating is positive (above threshold)
    if (isPositive) {
      copyTextToClipboard(effectiveComments);
      setShowCopiedNotification(true);
      setTimeout(() => setShowCopiedNotification(false), 4400);
    }

    if (isCurrentlyPublished) {
      if (isPositive) {
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
      // Set hasSubmittedAuto to true in simulator so the developer can interact with the congrats screen
      setHasSubmittedAuto(true);
      // Proactively trigger Sheet append automatically if Google account is connected
      if (token && resources.spreadsheetId) {
        handleAppendToRealSheet();
      }
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
        getEffectiveComments()
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
        const alertBody = `⚠️ URGENT ESCALATION: Negative Feedback received from ${formData.name}. Ratings: ${formData.rating} Stars. Comments: ${getEffectiveComments()}`;
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
          {hasSubmittedAuto ? (
            (() => {
              const threshold = routingConfig.starThreshold ?? 3;
              const isPositive = formData.rating > threshold;

              if (!isPositive) {
                // Negative rating: show the direct private feedback Thank You card
                return (
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm text-center space-y-5" id="negative-feedback-thanks">
                    <div className="w-16 h-16 bg-red-50 text-[#dc2626] rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle className="w-8 h-8" />
                    </div>
                    <div className="space-y-3">
                      <h3 className="text-xl font-bold text-slate-950">Thank you, {formData.name || 'Federico'}!</h3>
                      <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                        Your comments have been sent directly to our management team to help us improve. We truly appreciate your valuable feedback!
                      </p>
                    </div>
                    <div className="pt-2">
                      <button
                        onClick={() => {
                          setHasSubmittedAuto(false);
                          setVisitedPlatforms([]);
                          setHasFinishedSharing(false);
                          setFormData(prev => ({ ...prev, comments: '' }));
                        }}
                        className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition-all active:scale-95 animate-fade-in"
                      >
                        Submit Another Feedback
                      </button>
                    </div>
                  </div>
                );
              }

              // Positive rating: show the sequential review platforms sharing flow
              if (enabledPlatforms.length === 0 || hasFinishedSharing || remainingPlatforms.length === 0) {
                // Final positive thank you state
                return (
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm text-center space-y-5" id="published-congrats-card-final">
                    <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto animate-fade-in">
                      <CheckCircle className="w-8 h-8" />
                    </div>
                    <div className="space-y-3">
                      <h3 className="text-xl font-bold text-slate-950">Thank you, {formData.name || 'Federico'}!</h3>
                      <p className="text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                        Your review has been successfully recorded and shared. We are extremely grateful for your support!
                      </p>
                    </div>
                    <div className="pt-2">
                      <button
                        onClick={() => {
                          setHasSubmittedAuto(false);
                          setVisitedPlatforms([]);
                          setHasFinishedSharing(false);
                          setFormData(prev => ({ ...prev, comments: '' }));
                        }}
                        className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer transition-all active:scale-95"
                      >
                        Submit Another Feedback
                      </button>
                    </div>
                  </div>
                );
              }

              if (visitedPlatforms.length === 0) {
                // First step of positive flow: Show all enabled platforms to let them choose or skip
                return (
                  <div className="bg-slate-950 p-6 rounded-3xl border border-slate-900 shadow-xl text-center space-y-5 animate-fade-in" id="share-step-1">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-10 h-10 bg-slate-200 border border-slate-300 rounded-full flex items-center justify-center shrink-0 shadow-xs">
                        <Share2 className="w-5 h-5 text-slate-700" />
                      </div>
                      <h3 className="text-xl font-normal text-white">Thanks {formData.name ? formData.name.trim().split(' ')[0] : 'Federico'}!</h3>
                    </div>
                    <div className="space-y-3">
                      <p className="text-sm text-white max-w-md mx-auto leading-relaxed font-normal">
                        Keep sharing the love! Your review is already copied to the clipboard, all you have to do is click one of the platforms and paste it.
                      </p>
                    </div>

                    <div className="space-y-3 max-w-sm mx-auto pt-2">
                      <p className="text-[11px] text-white font-normal uppercase tracking-wider">NEXT</p>
                      <div className="flex flex-row justify-center gap-6 items-center flex-wrap">
                        {remainingPlatforms.map((platform) => {
                          let IconComponent = null;
                          if (platform.name === 'Facebook') {
                            IconComponent = (
                              <div className="w-8 h-8 bg-slate-200 border border-slate-300 rounded-full flex items-center justify-center shrink-0 shadow-xs">
                                <Facebook className="w-4 h-4 fill-[#1877f2] text-[#1877f2]" />
                              </div>
                            );
                          } else if (platform.name === 'Yelp') {
                            IconComponent = (
                              <div className="w-8 h-8 bg-slate-200 border border-slate-300 rounded-full flex items-center justify-center shrink-0 shadow-xs">
                                <Star className="w-4 h-4 fill-[#d32323] text-[#d32323]" />
                              </div>
                            );
                          } else {
                            IconComponent = (
                              <div className="w-8 h-8 bg-slate-200 border border-slate-300 rounded-full flex items-center justify-center shrink-0 shadow-xs">
                                <CheckSquare className="w-4 h-4 text-blue-500" />
                              </div>
                            );
                          }

                          return (
                            <button
                              key={platform.name}
                              onClick={() => handleSharePlatformClick(platform)}
                              className="text-sm font-normal text-yellow-400 hover:text-yellow-300 hover:underline transition-all cursor-pointer flex items-center gap-2 select-none"
                            >
                              {IconComponent}
                              <span>{platform.name}</span>
                            </button>
                          );
                        })}

                        {/* Third Option: Share via Email */}
                        <button
                          onClick={() => {
                            const subject = encodeURIComponent("Highly Recommend!");
                            const body = encodeURIComponent(formData.comments || "Highly recommended feedback!");
                            window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
                          }}
                          className="text-sm font-normal text-yellow-400 hover:text-yellow-300 hover:underline transition-all cursor-pointer flex items-center gap-2 select-none"
                        >
                          <div className="w-8 h-8 bg-slate-200 border border-slate-300 rounded-full flex items-center justify-center shrink-0 shadow-xs">
                            <Mail className="w-4 h-4 text-slate-700" />
                          </div>
                          <span>Email</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              // Subsequent steps of positive flow: Ask gently one-at-a-time for the remaining platforms
              const nextPlatform = remainingPlatforms[0];
              return (
                <div className="bg-slate-950 p-6 rounded-3xl border border-slate-900 shadow-xl text-center space-y-5 animate-fade-in" id="share-step-subsequent">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="w-10 h-10 bg-slate-200 border border-slate-300 rounded-full flex items-center justify-center shrink-0 shadow-xs">
                      <Share2 className="w-5 h-5 text-slate-700" />
                    </div>
                    <h3 className="text-xl font-normal text-white font-sans">Awesome!</h3>
                  </div>
                  <div className="space-y-3">
                    <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed font-normal">
                      Gently, would you also like to share your review on <strong className="text-white font-normal">{nextPlatform.name}</strong>? Your review text is still copied in your clipboard.
                    </p>

                    {formData.comments && (
                      <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl max-w-sm mx-auto text-left space-y-1 shadow-2xs">
                        <p className="text-[11px] text-slate-300 italic line-clamp-2 font-normal">"{formData.comments}"</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 max-w-xs mx-auto pt-2">
                    {(() => {
                      let IconComponent = null;
                      if (nextPlatform.name === 'Facebook') {
                        IconComponent = (
                          <div className="w-8 h-8 bg-slate-200 border border-slate-300 rounded-full flex items-center justify-center shrink-0 shadow-xs">
                            <Facebook className="w-4 h-4 fill-[#1877f2] text-[#1877f2]" />
                          </div>
                        );
                      } else if (nextPlatform.name === 'Yelp') {
                        IconComponent = (
                          <div className="w-8 h-8 bg-slate-200 border border-slate-300 rounded-full flex items-center justify-center shrink-0 shadow-xs">
                            <Star className="w-4 h-4 fill-[#d32323] text-[#d32323]" />
                          </div>
                        );
                      } else {
                        IconComponent = (
                          <div className="w-8 h-8 bg-slate-200 border border-slate-300 rounded-full flex items-center justify-center shrink-0 shadow-xs">
                            <CheckSquare className="w-4 h-4 text-blue-500" />
                          </div>
                        );
                      }

                      return (
                        <div className="flex justify-center">
                          <button
                            key={nextPlatform.name}
                            onClick={() => handleSharePlatformClick(nextPlatform)}
                            className="text-sm font-normal text-yellow-400 hover:text-yellow-300 hover:underline transition-all cursor-pointer flex items-center gap-2 select-none"
                          >
                            {IconComponent}
                            <span>Yes, {nextPlatform.name}</span>
                          </button>
                        </div>
                      );
                    })()}

                    <button
                      onClick={() => setHasFinishedSharing(true)}
                      className="w-full py-2 text-xs font-normal text-slate-500 hover:text-slate-300 hover:underline transition-all cursor-pointer"
                    >
                      No thanks, I'm all done
                    </button>
                  </div>
                </div>
              );
            })()
          ) : (
            <div className={isCurrentlyPublished ? "bg-white p-0 space-y-6" : "bg-white rounded-2xl border border-slate-100 p-6 shadow-xs"}>
              
              {!isCurrentlyPublished && (
                // Original Input Simulator header block for development mode
                <div className="mb-5">
                  <h3 className="font-semibold text-slate-900 text-lg">Input Simulator</h3>
                </div>
              )}

              <div className="space-y-4">
              {!isCurrentlyPublished && (
                user ? (
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
                )
              )}

              <div>
                <label className="flex items-center text-xs font-bold text-black mb-2">
                  <span className="flex items-center justify-center w-5 h-5 mr-1.5 rounded-full bg-black text-white text-[10px] font-bold shrink-0">1</span>
                  <span>Select Your Rating</span>
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => {
                        setFormData({ ...formData, rating: star });
                        setValidationError(null);
                        setShowAiCopiedBanner(false);
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
                  <label className="flex items-center text-xs font-bold text-black">
                    <span className="flex items-center justify-center w-5 h-5 mr-1.5 rounded-full bg-black text-white text-[10px] font-bold shrink-0">2</span>
                    <span>Compose Review</span>
                  </label>
                </div>
                <textarea
                  value={formData.comments}
                  onChange={(e) => {
                    setFormData({ ...formData, comments: e.target.value });
                    if (validationError) {
                      setValidationError(null);
                    }
                    setShowAiCopiedBanner(false);
                  }}
                  rows={3}
                  className={`w-full px-5 py-4 border rounded-xl focus:ring-2 focus:ring-red-100 font-typewriter text-[14px] leading-[18px] font-normal text-slate-900 ${
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

                {formData.rating <= (routingConfig.starThreshold ?? 3) && (
                  <div className="mt-2.5 flex flex-col gap-1.5" id="fix-together-container">
                    <button
                      type="button"
                      onClick={() => {
                        setFixTogether(!fixTogether);
                        setValidationError(null);
                      }}
                      className={`text-xs transition-all py-1 flex items-center gap-2 cursor-pointer active:scale-95 self-start select-none ${
                        fixTogether
                          ? 'text-slate-600 font-semibold'
                          : 'text-slate-400 hover:text-slate-500 font-normal'
                      }`}
                      id="fix-together-btn"
                    >
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                        fixTogether
                          ? 'border-slate-400 bg-slate-100'
                          : 'border-slate-300'
                      }`}>
                        {fixTogether && (
                          <Check className="w-2.5 h-2.5 text-slate-600 stroke-[3] shrink-0" />
                        )}
                      </div>
                      <span>Let's try to fix this together</span>
                    </button>
                  </div>
                )}

                {formData.rating > (routingConfig.starThreshold ?? 3) && (
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
                    {showAiCopiedBanner && (
                      <p className="text-[13px] font-bold text-slate-900 mt-2 border-l-2 border-yellow-400 pl-2 leading-normal" id="ai-copied-banner">
                        Copied! Click submit feedback, once you arrive simply paste into the review field.
                      </p>
                    )}
                  </div>
                )}


              </div>

              <button
                onClick={handleSubmitClick}
                disabled={isAutoSubmitting}
                className={`group flex items-center gap-2.5 p-0 bg-transparent border-0 text-[17px] font-bold cursor-pointer outline-none select-none transition-all ${
                  (!getEffectiveComments() || !getEffectiveComments().trim())
                    ? 'text-black hover:text-slate-800'
                    : 'text-[#dc2626] hover:text-[#b91c1c]'
                } disabled:text-slate-400`}
                id="run-sim-btn"
              >
                {isAutoSubmitting && (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0"></div>
                )}
                <span className={`flex items-center justify-center w-5 h-5 rounded-full text-white text-[10px] font-bold shrink-0 transition-all duration-200 ${
                  (!getEffectiveComments() || !getEffectiveComments().trim())
                    ? 'bg-black group-hover:bg-slate-800'
                    : 'bg-[#dc2626] group-hover:bg-[#b91c1c]'
                }`}>3</span>
                <span className="group-hover:underline transition-all duration-200">
                  {formData.rating <= (routingConfig.starThreshold ?? 3) ? "Submit" : "Submit & Paste"}
                </span>
              </button>
              {formData.rating > (routingConfig.starThreshold ?? 3) && (
                <div className="mt-3.5 p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11.5px] text-slate-600 leading-relaxed space-y-1.5" id="maps-ugc-policy-notice">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <Info className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span>Google Maps UGC Policy Safe</span>
                  </div>
                  <p>
                    To comply with Google’s User Generated Content (UGC) policy, this AI feature operates strictly as a **helpful writing aid to format and polish your real-world experience**. Deliberately fake, synthetic, or unverified reviews violate Google’s policy and can lead to review deletion or account suspension. Please review, personalize, and verify the drafted suggestion before posting to ensure it is completely honest and authentic.
                  </p>
                </div>
              )}
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
                        <div className="grid grid-cols-3 text-slate-600"><span className="font-medium">Comments:</span><span className="col-span-2 italic text-slate-500 truncate">{getEffectiveComments() || '(No comments)'}</span></div>
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
