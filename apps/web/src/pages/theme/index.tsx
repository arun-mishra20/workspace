/**
 * Theme Settings Page
 *
 * Example page demonstrating theme customization functionality.
 */

import { Badge } from "@workspace/ui/components/ui/badge";
import { Button } from "@workspace/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/ui/card";
import { useThemeCustomization } from "../../themes";
import { ThemeSettingsDialog } from "./components/theme-settings-dialog";
import { MainLayout } from "@/components/layouts/main-layout";

export default function ThemeSettingsPage() {
  const { currentPreset, overrides } = useThemeCustomization();

  const totalOverrides =
    Object.keys(overrides.light).length + Object.keys(overrides.dark).length;

  return (
    <MainLayout>
      <div className="container mx-auto p-8 space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Theme Customization</h1>
          <p className="text-muted-foreground">
            Customize your theme with presets and granular CSS variable
            overrides.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Current Theme Card */}
          <Card>
            <CardHeader>
              <CardTitle>Current Theme</CardTitle>
              <CardDescription>
                Active preset and customizations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Preset</div>
                <Badge variant="secondary" className="text-base">
                  {currentPreset.charAt(0).toUpperCase() +
                    currentPreset.slice(1)}
                </Badge>
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">
                  Overrides
                </div>
                <div className="text-2xl font-bold">{totalOverrides}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {Object.keys(overrides.light).length} light ·{" "}
                  {Object.keys(overrides.dark).length} dark
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preview Card */}
          <Card>
            <CardHeader>
              <CardTitle>Theme Preview</CardTitle>
              <CardDescription>See your theme in action</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Button size="sm">Primary</Button>
                <Button size="sm" variant="secondary">
                  Secondary
                </Button>
                <Button size="sm" variant="outline">
                  Outline
                </Button>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="destructive">
                  Destructive
                </Button>
                <Button size="sm" variant="ghost">
                  Ghost
                </Button>
              </div>
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm text-muted-foreground">
                  Muted background with muted foreground text
                </p>
              </div>
              <div className="p-3 bg-accent rounded-md">
                <p className="text-sm text-accent-foreground">
                  Accent background with accent foreground text
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Actions Card */}
          <Card>
            <CardHeader>
              <CardTitle>Customize</CardTitle>
              <CardDescription>
                Open theme settings to make changes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ThemeSettingsDialog>
                <Button className="w-full">Open Theme Settings</Button>
              </ThemeSettingsDialog>
              <p className="text-xs text-muted-foreground mt-4">
                Changes are automatically saved to localStorage and applied in
                real-time.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Color Palette Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Color Palette</CardTitle>
            <CardDescription>Current theme colors</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <ColorSwatch name="Background" variable="--background" />
              <ColorSwatch name="Foreground" variable="--foreground" />
              <ColorSwatch name="Primary" variable="--primary" />
              <ColorSwatch name="Secondary" variable="--secondary" />
              <ColorSwatch name="Muted" variable="--muted" />
              <ColorSwatch name="Accent" variable="--accent" />
              <ColorSwatch name="Destructive" variable="--destructive" />
              <ColorSwatch name="Border" variable="--border" />
              <ColorSwatch name="Card" variable="--card" />
              <ColorSwatch name="Popover" variable="--popover" />
              <ColorSwatch name="Input" variable="--input" />
              <ColorSwatch name="Ring" variable="--ring" />
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}

function ColorSwatch({ name, variable }: { name: string; variable: string }) {
  return (
    <div className="space-y-2">
      <div
        className="h-16 rounded-md border border-border"
        style={{ backgroundColor: `var(${variable})` }}
      />
      <div className="text-xs">
        <div className="font-medium">{name}</div>
        <div className="text-muted-foreground font-mono">{variable}</div>
      </div>
    </div>
  );
}
