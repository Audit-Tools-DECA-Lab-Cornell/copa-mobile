import { useTranslation } from "react-i18next";
import { Text } from "tamagui";

import { useDesignSystem } from "lib/design-system";
import { useAuthStore } from "stores/auth-store";

/**
 * Small identity line shown on audit execution screens so the auditor can
 * confirm which account the audit they are working on will be attributed to.
 * Renders nothing when no one is signed in.
 */
export function LoggedInAsNotice() {
    const ds = useDesignSystem();
    const { t } = useTranslation("audit");
    const session = useAuthStore((state) => state.session);

    if (session === null) {
        return null;
    }

    const name = session.user.name;
    const displayName = name !== null && name.trim().length > 0 ? name : session.user.email;

    return (
        <Text
            color={ds.colors.mutedForeground}
            fontFamily={ds.fonts.bodyMedium}
            fontSize={ds.typography.bodySm.fontSize}
            lineHeight={ds.typography.bodySm.lineHeight}
        >
            {t("loggedInAs", { name: displayName })}
        </Text>
    );
}
