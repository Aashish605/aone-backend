interface FacebookError {
  response?: {
    data?: {
      error?: {
        code: number;
        error_subcode?: number;
        message?: string;
        type?: string;
      };
    };
  };
}

export function isTokenRevoked(err: unknown): boolean {
  const fbErr = (err as FacebookError)?.response?.data?.error;
  return fbErr?.code === 190 && fbErr?.error_subcode === 460;
}

export function isOAuthException(err: unknown): boolean {
  const fbErr = (err as FacebookError)?.response?.data?.error;
  return fbErr?.type === 'OAuthException';
}
