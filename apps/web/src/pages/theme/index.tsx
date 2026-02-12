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
import { Input } from "@workspace/ui/components/ui/input";
import { Textarea } from "@workspace/ui/components/ui/textarea";
import { ThemeEditorPanel } from "./components/theme-editor-panel";
import { MainLayout } from "@/components/layouts/main-layout";

export default function ThemeSettingsPage() {
  return (
    <MainLayout>
      <div className="container mx-auto mb-10 space-y-6 px-4 py-6 md:px-6">
        <div className="space-y-2">
          <h1 className="font-display text-3xl font-extrabold tracking-tight md:text-5xl">
            Theme Editor
          </h1>
          <p className="text-muted-foreground">
            Customize your design system visually.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(320px,420px)_minmax(0,1fr)]">
          {/* LEFT: Controls */}
          <Card className="flex flex-col lg:sticky lg:top-6 lg:max-h-[calc(100dvh-8rem)]">
            <CardHeader>
              <CardTitle>Controls</CardTitle>
              <CardDescription>Presets and variables</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden py-4">
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
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Button>Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="destructive">Danger</Button>
      </div>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Sample Card</CardTitle>
          <CardDescription>
            Card, inputs, and typography using the selected preset.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Project name" />
          <Textarea placeholder="Brief product description..." />
          <p className="text-muted-foreground text-sm">
            Muted text remains accessible in each preset.
          </p>
        </CardContent>
      </Card>

      <div className="flex flex-col items-start gap-4 rounded-3xl p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-display text-2xl font-bold tracking-tight">
            Surface Physics
          </p>
          <p className="text-muted-foreground text-sm">
            Switch to the Neumorphism preset to preview nested depth.
          </p>
        </div>
        <div className="neu-float neu-orb">
          <div className="neu-orb-inner">
            <div className="neu-orb-core" />
          </div>
        </div>
      </div>
    </div>
  );
}
