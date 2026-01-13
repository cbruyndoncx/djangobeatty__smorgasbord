/**
 * API Route: POST /api/deacon/control
 * Controls the gt deacon - start/stop/restart
 */

import { NextRequest, NextResponse } from 'next/server';
import { execGt } from '@/lib/exec-gt';

export const dynamic = 'force-dynamic';

interface ControlRequest {
  action: 'start' | 'stop' | 'restart' | 'pause' | 'resume';
}

interface ControlResponse {
  success: boolean;
  action: string;
  message: string;
  output?: string;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ControlRequest = await request.json();
    const { action } = body;

    if (!action || !['start', 'stop', 'restart', 'pause', 'resume'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be start, stop, restart, pause, or resume' },
        { status: 400 }
      );
    }

    // Use gt deacon commands
    let command: string;
    switch (action) {
      case 'start':
        command = 'gt deacon start';
        break;
      case 'stop':
        command = 'gt deacon stop';
        break;
      case 'restart':
        command = 'gt deacon restart';
        break;
      case 'pause':
        command = 'gt deacon pause';
        break;
      case 'resume':
        command = 'gt deacon resume';
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    const response: ControlResponse = {
      success: false,
      action,
      message: '',
    };

    try {
      const { stdout, stderr } = await execGt(command, {
        timeout: 10000,
      });

      response.success = true;
      response.message = `Deacon ${action} command executed successfully`;
      response.output = stdout || stderr || '';
    } catch (execError) {
      const error = execError as { stdout?: string; stderr?: string; message?: string };
      const errorMessage = error.stderr || error.message || '';
      const output = error.stdout || '';

      // Handle cases where the command "fails" but the desired state is achieved
      const alreadyRunning = errorMessage.includes('session already running') || errorMessage.includes('already running');
      const alreadyStopped = errorMessage.includes('not running') || errorMessage.includes('no deacon');

      if (action === 'start' && alreadyRunning) {
        response.success = true;
        response.message = 'Deacon is already running';
        response.output = output;
      } else if (action === 'stop' && alreadyStopped) {
        response.success = true;
        response.message = 'Deacon is already stopped';
        response.output = output;
      } else {
        response.success = false;
        response.message = `Deacon ${action} command failed`;
        response.error = errorMessage;
        response.output = output;
      }
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error controlling deacon:', error);
    return NextResponse.json(
      { error: 'Failed to control deacon' },
      { status: 500 }
    );
  }
}
