import { Request, Response, NextFunction } from 'express';

interface TurnstileVerifyResponse {
  success: boolean;
  'error-codes'?: string[];
  challenge_ts?: string;
  hostname?: string;
}

export class TurnStyle {
  private secretKey: string;
  private readonly VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

  constructor(secretKey?: string) {
    this.secretKey = secretKey || process.env.TURNSTILE_SECRET_KEY || '';
    if (!this.secretKey) {
      console.warn('TurnStyle: No secret key provided. CAPTCHA verification will be disabled.');
    }
  }

  /**
   * Verify Cloudflare Turnstile token
   */
  async verify(token: string, remoteIp?: string): Promise<TurnstileVerifyResponse> {
    if (!this.secretKey) {
      console.warn('TurnStyle verification skipped: No secret key configured');
      return { success: true }; // Allow through if not configured
    }

    try {
      const formData = new URLSearchParams();
      formData.append('secret', this.secretKey);
      formData.append('response', token);
      if (remoteIp) {
        formData.append('remoteip', remoteIp);
      }

      const response = await fetch(this.VERIFY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      });

      const result: TurnstileVerifyResponse = await response.json();
      return result;
    } catch (error) {
      console.error('TurnStyle verification error:', error);
      return {
        success: false,
        'error-codes': ['internal-error'],
      };
    }
  }

  /**
   * Express middleware for Turnstile verification
   */
  middleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!this.secretKey) {
      // Skip verification if not configured
      next();
      return;
    }

    const token = req.body['cf-turnstile-response'] || req.headers['cf-turnstile-response'];

    if (!token) {
      res.status(400).json({
        success: false,
        message: 'CAPTCHA token is required',
      });
      return;
    }

    const remoteIp = (req.ip || req.headers['x-forwarded-for']) as string;
    const result = await this.verify(token as string, remoteIp);

    if (!result.success) {
      res.status(403).json({
        success: false,
        message: 'CAPTCHA verification failed',
        errors: result['error-codes'],
      });
      return;
    }

    next();
  };

  /**
   * Check if TurnStyle is enabled
   */
  isEnabled(): boolean {
    return !!this.secretKey;
  }
}
