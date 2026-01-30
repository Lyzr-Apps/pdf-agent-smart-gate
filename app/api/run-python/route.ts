import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'

const execAsync = promisify(exec)

export async function POST() {
  try {
    const scriptPath = path.join(process.cwd(), 'hello_world.py')

    const { stdout, stderr } = await execAsync(`python3 ${scriptPath}`)

    if (stderr) {
      return NextResponse.json({
        success: false,
        error: stderr,
      })
    }

    return NextResponse.json({
      success: true,
      output: stdout.trim(),
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to execute Python script',
    })
  }
}
