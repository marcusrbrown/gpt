import type {Key} from 'react'
import {DefaultLayout} from '@/components/layouts'
import {AppearanceSettings} from '@/components/settings/appearance-settings'
import {DataSettings} from '@/components/settings/data-settings'
import {MCPSettings} from '@/components/settings/mcp-settings'
import {ProviderSettings} from '@/components/settings/provider-settings'
import {cn, ds} from '@/lib/design-system'
import {Card, CardBody, Tab, Tabs} from '@heroui/react'
import {Database, Palette, Plug, Settings} from 'lucide-react'
import {useState} from 'react'

type SettingsTab = 'providers' | 'integrations' | 'appearance' | 'data'

/**
 * Global settings page with tabbed navigation.
 * Accessible from navbar on all pages via /settings route.
 */
export function SettingsPage() {
  const [selectedTab, setSelectedTab] = useState<SettingsTab>('providers')

  const handleTabChange = (key: Key) => {
    setSelectedTab(key as SettingsTab)
  }

  return (
    <DefaultLayout maxWidth="lg">
      <div className="space-y-6">
        <header>
          <h1 className={cn(ds.text.heading.h1)}>Settings</h1>
          <p className={cn(ds.text.body.base, 'mt-2')}>Configure your AI providers, integrations, and preferences</p>
        </header>

        <Tabs
          aria-label="Settings sections"
          selectedKey={selectedTab}
          onSelectionChange={handleTabChange}
          variant="underlined"
          color="primary"
          classNames={{
            base: 'w-full',
            tabList: 'gap-4 w-full relative rounded-none border-b border-divider p-0',
            cursor: 'w-full bg-primary',
            tab: 'max-w-fit px-2 h-12',
            tabContent: 'group-data-[selected=true]:text-primary',
          }}
        >
          <Tab
            key="providers"
            title={
              <div className="flex items-center gap-2">
                <Settings size={16} />
                <span>AI Providers</span>
              </div>
            }
          >
            <Card className="mt-6 shadow-sm">
              <CardBody className="p-6">
                <ProviderSettings />
              </CardBody>
            </Card>
          </Tab>

          <Tab
            key="integrations"
            title={
              <div className="flex items-center gap-2">
                <Plug size={16} />
                <span>Integrations</span>
              </div>
            }
          >
            <Card className="mt-6 shadow-sm">
              <CardBody className="p-6">
                <MCPSettings />
              </CardBody>
            </Card>
          </Tab>

          <Tab
            key="appearance"
            title={
              <div className="flex items-center gap-2">
                <Palette size={16} />
                <span>Appearance</span>
              </div>
            }
          >
            <Card className="mt-6 shadow-sm">
              <CardBody className="p-6">
                <AppearanceSettings />
              </CardBody>
            </Card>
          </Tab>

          <Tab
            key="data"
            title={
              <div className="flex items-center gap-2">
                <Database size={16} />
                <span>Data</span>
              </div>
            }
          >
            <Card className="mt-6 shadow-sm">
              <CardBody className="p-6">
                <DataSettings />
              </CardBody>
            </Card>
          </Tab>
        </Tabs>
      </div>
    </DefaultLayout>
  )
}
