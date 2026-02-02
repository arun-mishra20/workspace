/**
 * Theme Settings Page
 *
 * Example page demonstrating theme customization functionality.
 */

import { Button } from "@workspace/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/ui/card";
import { ThemeEditorPanel } from "./components/theme-settings-dialog";
import { MainLayout } from "@/components/layouts/main-layout";

export default function ThemeSettingsPage() {
  return (
    <MainLayout>
      <div className="container mx-auto p-6 space-y-4 mb-10">
        <div>
          <h1 className="text-3xl font-bold">Theme Editor</h1>
          <p className="text-muted-foreground">
            Customize your design system visually.
          </p>
        </div>

        <div className="grid grid-cols-[460px_1fr] gap-6">
          {/* LEFT: Controls */}
          <Card className="flex flex-col">
            <CardHeader>
              <CardTitle>Controls</CardTitle>
              <CardDescription>Presets and variables</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden">
              <ThemeEditorPanel />
            </CardContent>
          </Card>

          {/* RIGHT: Live Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Live Preview</CardTitle>
              <CardDescription>
                Your components using this theme
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PreviewSandbox />
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}

function PreviewSandbox() {
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button>Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="destructive">Danger</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sample Card</CardTitle>
          <CardDescription>Card using current theme</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <input
            className="border rounded-md px-3 py-2 w-full bg-background"
            placeholder="Input field"
          />
          <p className="text-muted-foreground text-sm">Muted text example</p>
        </CardContent>
      </Card>

      <div className="p-4 rounded-md bg-accent text-accent-foreground">
        Accent background example
      </div>
    </div>
  );
}
