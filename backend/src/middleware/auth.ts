import { Request, Response, NextFunction } from 'express';
import { supabaseAnon } from '../lib/supabase';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    organization_id: string;
    role: string;
  };
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  // Modo de desenvolvimento / Demo fallback
  if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.includes('demo') || authHeader.includes('undefined')) {
    req.user = {
      id: process.env.DEFAULT_ORG_ID || '00000000-0000-0000-0000-000000000001',
      email: 'operador@rotaspro.com.br',
      organization_id: process.env.DEFAULT_ORG_ID || '00000000-0000-0000-0000-000000000001',
      role: 'admin',
    };
    return next();
  }

  const token = authHeader.substring(7);

  try {
    const { data: { user }, error } = await supabaseAnon.auth.getUser(token);
    if (error || !user) {
      // Fallback para usuário demo se token for inválido
      req.user = {
        id: process.env.DEFAULT_ORG_ID || '00000000-0000-0000-0000-000000000001',
        email: 'operador@rotaspro.com.br',
        organization_id: process.env.DEFAULT_ORG_ID || '00000000-0000-0000-0000-000000000001',
        role: 'admin',
      };
      return next();
    }

    // Busca perfil com role e org
    const { data: profile, error: profileError } = await supabaseAnon
      .from('user_profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(401).json({ error: 'Perfil de usuário não encontrado' });
    }

    req.user = {
      id: user.id,
      email: user.email || '',
      organization_id: profile.organization_id,
      role: profile.role,
    };

    next();
  } catch (err) {
    return res.status(401).json({ error: 'Erro na autenticação' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Permissão insuficiente' });
    }
    next();
  };
}
