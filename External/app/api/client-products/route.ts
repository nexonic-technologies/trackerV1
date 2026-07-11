import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:3000';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('agentId');
    
    if (!agentId) {
      return NextResponse.json(
        { error: 'Agent ID is required' },
        { status: 400 }
      );
    }

    const response = await fetch(`${BACKEND_URL}/api/populate/read/agents/${agentId}?clientProducts=true`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-source': 'external',
        'Authorization': `Bearer temp-external-token`
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch client products');
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching client products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch client products' },
      { status: 500 }
    );
  }
}