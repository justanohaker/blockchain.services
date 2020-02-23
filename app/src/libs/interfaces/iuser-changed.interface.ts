export interface IUserChanger {
    onUserChanged(): Promise<void>
}