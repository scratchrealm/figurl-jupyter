import { FunctionComponent, useEffect, useMemo, useRef, useState } from 'react';
import FigInterface from './FigInterface';
import QueryParameters from './QueryParameters';
import randomAlphaString from './util/randomAlphaString';
import urlFromUri from './util/urlFromUri';

type Props = {
    model: WidgetModel
}

const width = 1200
const height = 1200
// https://figurl.org/f?v=gs://figurl/spikesortingview-8&d=sha1://97983b8e6a80650ef2f34ae606fc9b553af5c94d&label=Autocorrelograms%20example
const queryParameters: QueryParameters = {
    viewUri: 'gs://figurl/spikesortingview-8',
    dataUri: 'sha1://97983b8e6a80650ef2f34ae606fc9b553af5c94d',
    label: 'Autocorrelograms example'
}
const parentOrigin = window.location.protocol + '//' + window.location.host
const figureId = randomAlphaString(10)
import createElectronInterface from './createElectronInterface'
import { WidgetModel } from '@jupyter-widgets/base';

const TestWidget: FunctionComponent<Props> = ({model}) => {
    const iframeElement = useRef<HTMLIFrameElement | null>()
    const viewUrlBase = urlFromUri(queryParameters.viewUri || '')
    const viewUrl = viewUrlBase + '/index.html'
    const [figInterface, setFigInterface] = useState<FigInterface | undefined>(undefined)
    const src = useMemo(() => {
        let ret = `${viewUrl}?parentOrigin=${parentOrigin}&figureId=${figureId}`
        return ret
    }, [parentOrigin, viewUrl])
    useEffect(() => {
        const electronInterface = createElectronInterface(model)
        const figInterface = new FigInterface({ electronInterface, figureId, iframeElement })
        figInterface.initialize(queryParameters).then(() => {
            setFigInterface(figInterface)
        })
    }, [queryParameters, iframeElement, figureId, model])
    return (
        // important to use relative position rather than absolute (took me a while to figure that out)
        <div style={{ position: 'relative', width, height, overflow: 'hidden' }}>
            <iframe
                ref={e => { iframeElement.current = e }}
                title="figure"
                src={src}
                width={width - 15}
                height={height - 15}
            />
        </div>
    );
}

export default TestWidget;