export const DEFAULT_PROFILE_PHOTO = "/imagens/user-img-default.jpg";

export function getProfilePhotoSource(photo) {
    return typeof photo === "string" && photo.trim()
        ? photo.trim()
        : DEFAULT_PROFILE_PHOTO;
}
