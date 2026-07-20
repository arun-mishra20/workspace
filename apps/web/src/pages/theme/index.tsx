import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@workspace/ui/components/ui/card'

import { ThemeEditorPanel } from './components/theme-editor-panel'
import { MainLayout } from '@/components/layouts/main-layout'
import { PreviewSandbox } from './components/preview-sandbox'
import { useThemeCustomization } from '@/themes/context'
import { PresetGallery } from './components/preset-gallery'
import { NavigationLayoutSelector } from './components/navigation-layout-selector'
import { ScrollArea } from '@workspace/ui/components/ui/scroll-area'
import { Button } from '@workspace/ui/components/ui/button'

export default function ThemeSettingsPage() {
  const {
    currentPreset,
    navigationLayout,
    overrides,
    availablePresets,
    setPreset,
    setNavigationLayout,
    clearOverrides,
    reset,
  } = useThemeCustomization()
  const handleReset = () => {
    if (confirm('Reset all theme customizations to default?')) {
      reset()
    }
  }

  const handleClearOverrides = () => {
    if (confirm('Clear all overrides and return to preset defaults?')) {
      clearOverrides()
    }
  }
  return (
    <MainLayout>
      <div className="mx-auto flex w-full max-w-[1360px] flex-1 flex-col px-4 pb-8 sm:px-6 lg:px-10">
        <header className="pb-5">
          <div className="flex flex-col gap-1.5 pt-5">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              Workspace
            </p>
            <h1 className="font-serif text-3xl font-medium italic tracking-tight text-foreground sm:text-[2.375rem] sm:leading-tight">
              Customize
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Customize your design system visually.
            </p>
          </div>
        </header>
        <div className="grid gap-6 lg:grid-cols-[minmax(320px,420px)_minmax(0,1fr)]">
          {/* LEFT: Controls */}
          <Card className="flex flex-col lg:sticky lg:top-6 lg:max-h-[calc(100dvh)]">
            <CardHeader>
              <CardTitle className="font-serif text-lg font-semibold tracking-tight">
                Controls
              </CardTitle>
              <CardDescription>Layout, presets, and variables</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden py-4">
              <ScrollArea className="h-full">
                <div className="space-y-6 pr-4">
                  <NavigationLayoutSelector
                    value={navigationLayout}
                    onChange={setNavigationLayout}
                  />
                  <PresetGallery
                    presets={availablePresets}
                    currentPreset={currentPreset}
                    onSelect={setPreset}
                  />
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
          {/* RIGHT: Live Preview */}
          <Card>
            <CardHeader>
              <div className="flex w-full justify-between">
                <div>
                  <CardTitle className="font-serif text-lg font-semibold tracking-tight">
                    Live Preview and Customization
                  </CardTitle>
                  <CardDescription>
                    Your components using this theme
                  </CardDescription>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleClearOverrides}
                    >
                      Clear
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleReset}>
                      Reset
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {Object.keys(overrides.light).length +
                      Object.keys(overrides.dark).length}{' '}
                    overrides
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ThemeEditorPanel />
              <PreviewSandbox />
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  )
}
