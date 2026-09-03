import { shareApp } from '@/lib/hono-share';

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const url = new URL(req.url);
  const honoReq = new Request(new URL(`/share/${token}`, url.origin).toString(), {
    method: 'GET',
    headers: req.headers,
  });
  return shareApp.fetch(honoReq);
}

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const url = new URL(req.url);
  const body = await req.text();
  const honoReq = new Request(new URL(`/share/${token}`, url.origin).toString(), {
    method: 'POST',
    headers: req.headers,
    body,
  });
  return shareApp.fetch(honoReq);
}
