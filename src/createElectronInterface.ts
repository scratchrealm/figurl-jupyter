import { WidgetModel } from "@jupyter-widgets/base"
import { ElectronInterface } from "./FigInterface"
import QueryParameters from "./QueryParameters"
import { hexToPrivateKey, hexToPublicKey, signMessage } from "./commonInterface/crypto/signatures"
import randomAlphaString from "./util/randomAlphaString"
import { FigurlRequest, FigurlResponse, InitiateTaskResponse, StoreFileResponse } from "./viewInterface/FigurlRequestTypes"
import { PrivateKeyHex, PublicKeyHex, sha1OfObject, sha1OfString } from "./viewInterface/kacheryTypes"
import { TaskJobStatus, TaskType } from "./viewInterface/MessageToChildTypes"
import axios from 'axios'
import { KacherycloudRequest, KacherycloudResponse } from "./types/KacherycloudRequest"
import { NodeId } from "./commonInterface/kacheryTypes"

const createElectronInterface = (model: WidgetModel, clientInfo: {clientId?: string, privateKey?: string, defaultProjectId?: string}): ElectronInterface => {

    let queryParameters: QueryParameters = {}

    const setQueryParameters = async (q: QueryParameters) => {
        queryParameters = q
    }

    const taskStatusUpdateCallbacks: ((a: {taskType: TaskType, taskName: string, taskJobId: string, status: TaskJobStatus, errorMessage?: string}) => void)[] = []

    const loadFileDataCallbacks: {[uri: string]: ((d: string | undefined) => void)[]} = {}
    const onFileData = (uri: string, callback: (d: string | undefined) => void) => {
        if (!loadFileDataCallbacks[uri]) loadFileDataCallbacks[uri] = []
        loadFileDataCallbacks[uri].push(callback)
    }
    const loadTaskReturnValueCallbacks: {[key: string]: ((d: string | undefined) => void)[]} = {}
    const onTaskReturnValue = (o: {taskName: string, taskJobId: string}, callback: (d: string | undefined) => void) => {
        const {taskName, taskJobId} = o
        const key = `${taskName}.${taskJobId}`
        if (!loadTaskReturnValueCallbacks[key]) loadTaskReturnValueCallbacks[key] = []
        loadTaskReturnValueCallbacks[key].push(callback)
    }
    model.on('msg:custom', msg => {
        console.info('Message from python', msg)
        if (msg.type === 'loadFileDataResponse') {
            const {fileData, uri} = msg
            const callbacks = loadFileDataCallbacks[uri]
            if (callbacks) {
                loadFileDataCallbacks[uri] = []
                for (let cb of callbacks) {
                    cb(fileData)
                }
            }
        }
        else if (msg.type === 'loadTaskReturnValueResponse') {
            const {data, taskName, taskJobId} = msg
            const key = `${taskName}.${taskJobId}`
            const callbacks = loadTaskReturnValueCallbacks[key]
            if (callbacks) {
                loadTaskReturnValueCallbacks[key] = []
                for (let cb of callbacks) {
                    cb(data)
                }
            }
        }
        else if (msg.type === 'taskStatusUpdate') {
            const {taskType, taskName, taskJobId, status, error} = msg as {taskType: TaskType, taskName: string, taskJobId: string, status: TaskJobStatus, error: string | undefined}
            for (let cb of taskStatusUpdateCallbacks) {
                cb({taskType, taskName, taskJobId, status, errorMessage: error})
            }
        }
        else if (msg.type === 'messageToFrontend') {
            for (let cb of onMessageFromBackendCallbacks) {
                cb(msg.message)
            }
        }
    })

    async function loadFileData(uri: string) {
        model.send({type: 'loadFileDataRequest', uri}, () => {})
        return new Promise<string | undefined>((resolve, reject) => {
            onFileData(uri, (fileData: string | undefined) => {
                resolve(fileData ? JSON.parse(fileData) : undefined)
            })
        })
    }

    async function getTaskReturnValue(o: {taskName: string, taskJobId: string}) {
        const {taskName, taskJobId} = o
        model.send({type: 'loadTaskReturnValue', taskName, taskJobId}, () => {})
        return new Promise<string | undefined>((resolve, reject) => {
            onTaskReturnValue({taskName, taskJobId}, (data: string | undefined) => {
                resolve(data ? JSON.parse(data) : undefined)
            })
        })
    }

    const handleFigurlRequest = async (req: FigurlRequest): Promise<FigurlResponse | undefined> => {
        if (req.type === 'getFigureData') {
            if (!queryParameters.dataUri) throw Error('dataUri is not set in preload.ts')
            const figureData = await loadFileData(queryParameters.dataUri)
            return {
                type: 'getFigureData',
                figureData
            }
        }
        else if (req.type === 'getFileData') {
            const fileData = await loadFileData(req.uri)
            return {
                type: 'getFileData',
                fileData
            }
        }
        else if (req.type === 'initiateTask') {
            const {taskInput, taskName, taskType} = req
            const taskJobId = taskType === 'calculation' ? (
                sha1OfObject({taskName, taskInput})
            ) : (
                sha1OfString(randomAlphaString(100))
            )

            if (taskType === 'calculation') {
                // see if already finished
                const returnValue = await getTaskReturnValue({taskName, taskJobId: taskJobId.toString()})
                if (returnValue !== undefined) {
                    // already finished, no pubsub needed
                    return {
                        type: 'initiateTask',
                        taskJobId: taskJobId.toString(),
                        status: 'finished',
                        returnValue
                    }
                }
            }

            model.send({type: 'requestTask', taskType, taskName, taskInput, taskJobId}, () => {})

            const ret: InitiateTaskResponse = {
                type: 'initiateTask',
                taskJobId: taskJobId.toString(),
                status: 'waiting'
            }
            return ret
        }
        else if (req.type === 'storeFile') {
            const {fileData} = req
            const projectId = req.projectId || clientInfo.defaultProjectId
            if (!projectId) {
                throw Error('Cannot store file. No project ID.')
            }
            if (!clientInfo.clientId) {
                throw Error('Cannot store file. No client ID.')
            }
            if (!clientInfo.privateKey) {
                throw Error('Cannot store file. No private key.')
            }
            const sha1 = sha1OfString(fileData)
            const uri = `sha1://${sha1}`
            const payload = {
                type: 'initiateFileUpload' as 'initiateFileUpload',
                size: fileData.length,
                hashAlg: 'sha1' as 'sha1',
                hash: sha1.toString(),
                projectId: projectId,
                timestamp: Date.now()
            }
            const kacheryCloudUrl = `http://kacheryhub.org/api/kacherycloud`
            const publicKey = hexToPublicKey(clientInfo.clientId as any as PublicKeyHex)
            const privateKey = hexToPrivateKey(clientInfo.privateKey as any as PrivateKeyHex)
            const kacheryCloudRequest: KacherycloudRequest = {
                payload,
                fromClientId: clientInfo.clientId as any as NodeId,
                signature: await signMessage(payload, {publicKey, privateKey})
            }
            const resp = await axios.post(kacheryCloudUrl, kacheryCloudRequest)
            const kacheryCloudResponse: KacherycloudResponse = resp.data
            if (kacheryCloudResponse.type !== 'initiateFileUpload') {
                throw Error('Unexpected response in initiateFileUpload')
            }
            let ret: StoreFileResponse
            if (kacheryCloudResponse.alreadyExists) {
                ret = {type: 'storeFile', uri}
            }
            else if (kacheryCloudResponse.alreadyPending) {
                throw Error('Cannot handle case for initiateFileUpload: alreadyPending')
            }
            else {
                const uploadUrl = kacheryCloudResponse.signedUploadUrl
                if (!uploadUrl) throw Error('No upload URL')
                await axios.put(uploadUrl, fileData)
                ret = {
                    type: 'storeFile',
                    uri
                }
            }
            return ret
        }
        else return undefined
    }
    const onTaskStatusUpdate = (callback: (a: {taskType: TaskType, taskName: string, taskJobId: string, status: TaskJobStatus, errorMessage?: string}) => void) => {
        taskStatusUpdateCallbacks.push(callback)
    }
    const sendMessageToBackend = (message: any) => {
        model.send({type: 'messageToBackend', message}, () => {})
    }
    const onMessageFromBackendCallbacks: ((message: any) => void)[] = []
    const onMessageFromBackend = (callback: (message: any) => void) => {
        onMessageFromBackendCallbacks.push(callback)
    }
    return {
        setQueryParameters,
        handleFigurlRequest,
        onTaskStatusUpdate,
        getTaskReturnValue,
        sendMessageToBackend,
        onMessageFromBackend
    }
}

export default createElectronInterface