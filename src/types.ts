export interface FormConfig {
  name: string;
  email: string;
  rating: number;
  comments: string;
}

export interface WorkspaceResources {
  spreadsheetId: string | null;
  spreadsheetUrl: string | null;
  formId: string | null;
  formUrl: string | null;
}

export interface RoutingConfiguration {
  excellentSubject: string;
  excellentBody: string;
  goodSubject: string;
  goodBody: string;
  neutralSubject: string;
  neutralBody: string;
  poorSubject: string;
  poorBody: string;
  supportEmail: string;
  googleReviewsUrl: string;
  starThreshold: number;
  yelpEnabled: boolean;
  yelpUrl: string;
  facebookEnabled: boolean;
  facebookUrl: string;
  bbbEnabled: boolean;
  bbbUrl: string;
}
