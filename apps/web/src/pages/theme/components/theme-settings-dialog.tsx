/**
 * Theme Settings Dialog
 *
 * Provides a UI for customizing theme presets and overriding CSS variables.
 */

import { useThemeCustomization } from "@/themes/context";
import { useState } from "react";
import { FontSelector } from "./font-selector";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/ui/select";
import { ColorPickerInput } from "./color-picker-input";
import { SliderInput } from "./slider-input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/ui/tabs";
import { Button } from "@workspace/ui/components/ui/button";
import { Separator } from "@workspace/ui/components/ui/separator";
import { ScrollArea } from "@workspace/ui/components/ui/scroll-area";
import { CATEGORY_LABELS, THEME_VARIABLES } from "@/themes";

interface ThemeSettingsDialogProps {
  children?: React.ReactNode;
}

export function ThemeSettingsDialog({ children }: ThemeSettingsDialogProps) {
  const {
    currentPreset,
    overrides,
    availablePresets,
    setPreset,
    setOverride,
    clearOverrides,
    reset,
    getComputedTheme,
  } = useThemeCustomization();

  const [open, setOpen] = useState(false);
  const [activeMode, setActiveMode] = useState<"light" | "dark">("light");

  // Get current theme values (preset + overrides)
  const computedTheme = getComputedTheme();
  const currentValues =
    activeMode === "light" ? computedTheme.light : computedTheme.dark;

  const handleReset = () => {
    if (
      confirm(
        "Reset all theme customizations to default? This cannot be undone.",
      )
    ) {
      reset();
    }
  };

  const handleClearOverrides = () => {
    if (confirm("Clear all overrides and return to preset defaults?")) {
      clearOverrides();
    }
  };

  // Helper function to render the appropriate input component
  const renderInputComponent = (variable: string, value: string) => {
    if (variable === "--font-sans") {
      return (
        <FontSelector
          label={variable}
          value={value}
          onChange={(newValue) => setOverride(activeMode, variable, newValue)}
          variableName={variable}
          fontType="sans"
        />
      );
    } else if (variable === "--font-serif") {
      return (
        <FontSelector
          label={variable}
          value={value}
          onChange={(newValue) => setOverride(activeMode, variable, newValue)}
          variableName={variable}
          fontType="serif"
        />
      );
    } else if (variable === "--font-mono") {
      return (
        <FontSelector
          label={variable}
          value={value}
          onChange={(newValue) => setOverride(activeMode, variable, newValue)}
          variableName={variable}
          fontType="mono"
        />
      );
    } else if (variable === "--radius") {
      return (
        <SliderInput
          label={variable}
          value={value}
          onChange={(newValue) => setOverride(activeMode, variable, newValue)}
          variableName={variable}
          min={0}
          max={2}
          step={0.125}
          unit="rem"
        />
      );
    } else if (variable === "--spacing") {
      return (
        <SliderInput
          label={variable}
          value={value}
          onChange={(newValue) => setOverride(activeMode, variable, newValue)}
          variableName={variable}
          min={0}
          max={1}
          step={0.05}
          unit="rem"
        />
      );
    } else if (variable === "--tracking-normal") {
      return (
        <SliderInput
          label={variable}
          value={value}
          onChange={(newValue) => setOverride(activeMode, variable, newValue)}
          variableName={variable}
          min={-0.05}
          max={0.1}
          step={0.001}
          unit="em"
        />
      );
    } else if (variable === "--font-size-base") {
      return (
        <SliderInput
          label={variable}
          value={value}
          onChange={(newValue) => setOverride(activeMode, variable, newValue)}
          variableName={variable}
          min={12}
          max={24}
          step={1}
          unit="px"
        />
      );
    } else {
      return (
        <ColorPickerInput
          label={variable}
          value={value}
          onChange={(newValue) => setOverride(activeMode, variable, newValue)}
          variableName={variable}
        />
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || <Button variant="outline">Theme Settings</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Theme Customization</DialogTitle>
          <DialogDescription>
            Customize your theme by selecting a preset and overriding specific
            variables.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Preset Selector */}
          <div className="flex flex-col gap-2 w-full">
            <label className="text-sm text-muted-foreground font-medium">
              Theme Preset
            </label>
            <Select value={currentPreset} onValueChange={setPreset}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a preset" />
              </SelectTrigger>
              <SelectContent>
                {availablePresets.map((preset) => (
                  <SelectItem key={preset} value={preset}>
                    {preset.charAt(0).toUpperCase() + preset.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Mode Tabs */}
          <Tabs
            value={activeMode}
            onValueChange={(v) => setActiveMode(v as "light" | "dark")}
            className="flex-1 overflow-hidden flex flex-col"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="light">Light Mode</TabsTrigger>
              <TabsTrigger value="dark">Dark Mode</TabsTrigger>
            </TabsList>

            <TabsContent
              value={activeMode}
              className="flex-1 overflow-hidden mt-4"
            >
              <ScrollArea className="h-125 pr-4">
                <div className="flex flex-col gap-2">
                  {/* Render each category */}
                  {Object.entries(THEME_VARIABLES).map(
                    ([category, variables]) => (
                      <div key={category} className="flex flex-col gap-2">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                          {
                            CATEGORY_LABELS[
                              category as keyof typeof CATEGORY_LABELS
                            ]
                          }
                        </h3>
                        <div className="flex flex-col gap-2 pl-2">
                          {variables.map((variable) => {
                            const value = currentValues[variable] || "";
                            const isOverridden =
                              !!overrides[activeMode][variable];

                            return (
                              <div key={variable} className="relative">
                                {renderInputComponent(variable, value)}
                                {isOverridden && (
                                  <span
                                    className="absolute -left-2 top-8 w-1 h-1 bg-primary rounded-full"
                                    title="Overridden"
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>

          {/* Action Buttons */}
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearOverrides}
              >
                Clear Overrides
              </Button>
              <Button variant="outline" size="sm" onClick={handleReset}>
                Reset
              </Button>
            </div>
            <div className="text-xs text-muted-foreground">
              {Object.keys(overrides.light).length +
                Object.keys(overrides.dark).length}{" "}
              overrides active
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
