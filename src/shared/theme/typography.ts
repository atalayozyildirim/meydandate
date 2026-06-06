// Ekranlar arasinda tutarli tipografi olcegini tanimlar.
export const typography = {
  title: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "800" as const
  },
  heading: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "800" as const
  },
  subheading: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: "700" as const
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "400" as const
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600" as const
  }
} as const;
