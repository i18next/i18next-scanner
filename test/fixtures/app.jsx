import { Fragment } from 'react';

const mycomp = () => (
    <Fragment>
        <Fragment>
            <Trans i18nKey="jsx-quotes-double">Use double quotes for the i18nKey attribute</Trans>
            <Trans i18nKey='jsx-quotes-single'>Use single quote for the i18nKey attribute</Trans>
            <Trans i18nKey="plural" count={count}>You have {{count}} apples</Trans>
            <Trans i18nKey="context" context="male">A boyfriend</Trans>
        </Fragment>
        <Fragment>
            <Trans i18nKey="multiline-text-string">
                multiline
                text
                string
            </Trans>
            <Trans i18nKey="string-literal">This is a <strong>test</strong></Trans>
            <Trans i18nKey="object-expression">This is a <strong>{{test}}</strong></Trans>
            <Trans i18nKey="arithmetic-expression">
                2 + 2 = {{ result: 2 + 2 }}
            </Trans>
            <Trans i18nKey="components">
                Go to <Anchor href="/administration/tools">Administration > Tools</Anchor> to download administrative tools.
            </Trans>
            <Trans i18nKey="lorem-ipsum">
                <p>Lorem Ipsum is simply dummy text of the printing and typesetting industry.</p>
                Lorem Ipsum is simply dummy text of the printing and typesetting industry.
                <p>Lorem Ipsum has been the industry's standard dummy text ever since the 1500s</p>
            </Trans>
            <Trans i18nKey="lorem-ipsum-nested">
                Lorem Ipsum is simply dummy text of the printing and typesetting industry.
                <p>
                    Lorem Ipsum is simply dummy text of the printing and typesetting industry.
                    <p>
                        {'Lorem Ipsum is simply dummy text of the printing and typesetting industry.'}
                    </p>
                </p>
                <p>
                    Lorem Ipsum has been the industry's standard dummy text ever since the 1500s
                </p>
            </Trans>
        </Fragment>
        <Fragment>
            <Trans>
                multiline
                text
                string
            </Trans>
            <Trans>This is a <strong>test</strong></Trans>
            <Trans>This is a <strong>{{test}}</strong></Trans>
            <Trans>
                2 + 2 = {{ result: 2 + 2 }}
            </Trans>
            <Trans>
                Go to <Anchor href="/administration/tools">Administration > Tools</Anchor> to download administrative tools.
            </Trans>
            <Trans>
                <p>Lorem Ipsum is simply dummy text of the printing and typesetting industry.</p>
                Lorem Ipsum is simply dummy text of the printing and typesetting industry.
                <p>Lorem Ipsum has been the industry's standard dummy text ever since the 1500s</p>
            </Trans>
            <Trans>
                Lorem Ipsum is simply dummy text of the printing and typesetting industry.
                <p>
                    Lorem Ipsum is simply dummy text of the printing and typesetting industry.
                    <p>
                        {'Lorem Ipsum is simply dummy text of the printing and typesetting industry.'}
                    </p>
                </p>
                <p>
                    Lorem Ipsum has been the industry's standard dummy text ever since the 1500s
                </p>
            </Trans>
        </Fragment>
        <Fragment>
            <Trans defaults="The component might be self-closing" />
            <Trans defaults="Hello <1>{{planet}}</1>!" tOptions={{planet: "World"}} components={[<strong>stuff</strong>]} />
        </Fragment>
        <Fragment>
            <I18n __t="mykey">A wrapper component with key</I18N>
            <I18n>A wrapper component without key</I18N>
        </Fragment>
    </Fragment>
)
