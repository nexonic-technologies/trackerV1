import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:3000';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authHeader = request.headers.get('authorization') || '';

    const response = await fetch(`${BACKEND_URL}/api/populate/read/clients/${id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-source': 'external',
        'Authorization': authHeader
      },
      body: JSON.stringify({
        populate: {
          proposedProducts: 'name'
        }
      })
    });

    if (!response.ok) {
      throw new Error('Failed to fetch client');
    }

    const data = await response.json();
    return NextResponse.json(data.data || {});
  } catch (error: any) {
    console.error('Error fetching client details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch client details' },
      { status: 500 }
    );
  }
}
