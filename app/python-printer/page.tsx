'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Play, Terminal, Code } from 'lucide-react'

export default function PythonPrinter() {
  const [output, setOutput] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runPythonScript = async () => {
    setLoading(true)
    setError(null)
    setOutput('')

    try {
      const response = await fetch('/api/run-python', {
        method: 'POST',
      })

      const data = await response.json()

      if (data.success) {
        setOutput(data.output)
      } else {
        setError(data.error || 'Failed to run script')
      }
    } catch (err) {
      setError('Network error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3">
            <Code className="w-10 h-10 text-blue-400" />
            <h1 className="text-4xl font-bold text-white">Python Hello World</h1>
          </div>
          <p className="text-gray-400">Run hello_world.py and see the output</p>
        </div>

        {/* Code Display Card */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Terminal className="w-5 h-5 text-green-400" />
              hello_world.py
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm border border-gray-700">
              <code>print("Hello, World!")</code>
            </pre>
          </CardContent>
        </Card>

        {/* Run Button */}
        <div className="flex justify-center">
          <Button
            onClick={runPythonScript}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg"
            size="lg"
          >
            {loading ? (
              <>
                <Terminal className="w-5 h-5 mr-2 animate-pulse" />
                Running...
              </>
            ) : (
              <>
                <Play className="w-5 h-5 mr-2" />
                Run Python Script
              </>
            )}
          </Button>
        </div>

        {/* Output Display */}
        {(output || error) && (
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Terminal className="w-5 h-5 text-blue-400" />
                Output
              </CardTitle>
            </CardHeader>
            <CardContent>
              {error ? (
                <div className="bg-red-900/20 border border-red-500/30 text-red-400 p-4 rounded-lg font-mono text-sm">
                  {error}
                </div>
              ) : (
                <pre className="bg-gray-900 text-white p-4 rounded-lg font-mono text-sm border border-gray-700">
                  <code>{output}</code>
                </pre>
              )}
            </CardContent>
          </Card>
        )}

        {/* Info Card */}
        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="pt-6">
            <div className="text-center text-gray-400 text-sm space-y-1">
              <p>This app executes the Python script located at:</p>
              <code className="text-blue-400">/app/nextjs-project/hello_world.py</code>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
