import EmojiSearch from "@/components/emoji-search"

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col bg-background">
      {/* Decorative floating emojis */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <span className="absolute top-[5%] left-[4%] text-4xl md:text-5xl opacity-20 animate-float" style={{ animationDelay: "0s" }}>{"😊"}</span>
        <span className="absolute top-[12%] right-[6%] text-3xl md:text-4xl opacity-15 animate-float" style={{ animationDelay: "0.8s" }}>{"❤️"}</span>
        <span className="absolute top-[22%] left-[12%] text-2xl md:text-3xl opacity-10 animate-float" style={{ animationDelay: "1.4s" }}>{"🐱"}</span>
        <span className="absolute top-[18%] right-[20%] text-3xl md:text-4xl opacity-10 animate-float" style={{ animationDelay: "2.1s" }}>{"🍕"}</span>
        <span className="absolute top-[35%] left-[2%] text-2xl md:text-3xl opacity-15 animate-float" style={{ animationDelay: "0.5s" }}>{"🌈"}</span>
        <span className="absolute top-[40%] right-[3%] text-3xl md:text-4xl opacity-10 animate-float" style={{ animationDelay: "3.2s" }}>{"🎸"}</span>
        <span className="absolute top-[55%] left-[8%] text-2xl md:text-3xl opacity-10 animate-float" style={{ animationDelay: "1.7s" }}>{"🦋"}</span>
        <span className="absolute top-[50%] right-[12%] text-2xl md:text-3xl opacity-15 animate-float" style={{ animationDelay: "2.6s" }}>{"🌟"}</span>
        <span className="absolute top-[65%] left-[3%] text-3xl md:text-4xl opacity-15 animate-float" style={{ animationDelay: "0.3s" }}>{"✨"}</span>
        <span className="absolute top-[62%] right-[7%] text-2xl md:text-3xl opacity-10 animate-float" style={{ animationDelay: "4.1s" }}>{"🍦"}</span>
        <span className="absolute bottom-[22%] left-[15%] text-2xl md:text-3xl opacity-10 animate-float" style={{ animationDelay: "1.2s" }}>{"🐶"}</span>
        <span className="absolute bottom-[18%] right-[18%] text-3xl md:text-4xl opacity-10 animate-float" style={{ animationDelay: "3.7s" }}>{"🎉"}</span>
        <span className="absolute bottom-[10%] left-[5%] text-3xl md:text-4xl opacity-15 animate-float" style={{ animationDelay: "2.4s" }}>{"🌸"}</span>
        <span className="absolute bottom-[8%] right-[5%] text-4xl md:text-5xl opacity-20 animate-float" style={{ animationDelay: "1s" }}>{"🎊"}</span>
        <span className="absolute top-[8%] left-[35%] text-2xl md:text-3xl opacity-10 animate-float" style={{ animationDelay: "3s" }}>{"🦄"}</span>
        <span className="absolute top-[75%] right-[25%] text-2xl md:text-3xl opacity-10 animate-float" style={{ animationDelay: "0.6s" }}>{"🍩"}</span>
        <span className="absolute top-[30%] left-[25%] text-2xl opacity-10 animate-float" style={{ animationDelay: "4.5s" }}>{"🚀"}</span>
        <span className="absolute bottom-[35%] right-[2%] text-2xl opacity-10 animate-float" style={{ animationDelay: "2.9s" }}>{"🎨"}</span>
        <span className="absolute bottom-[45%] left-[1%] text-2xl opacity-10 animate-float" style={{ animationDelay: "1.9s" }}>{"⚡"}</span>
        <span className="absolute top-[48%] left-[20%] text-2xl opacity-10 animate-float" style={{ animationDelay: "3.5s" }}>{"🌊"}</span>
      </div>

      {/* Header Section */}
      <header className="relative pt-8 pb-6 md:pt-16 md:pb-10 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-card/80 backdrop-blur-sm px-4 py-2 rounded-full border border-border mb-6 animate-slide-up">
            <span className="text-lg">{"🇲🇲"}</span>
            <span className="text-sm font-medium text-muted-foreground">Emoji Search</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-bold text-foreground tracking-tight mb-4 text-balance animate-slide-up" style={{ animationDelay: "0.1s", lineHeight: "1.6" }}>
            သင့်စိတ်နဲ့ကိုက်ညီတဲ့ အီမိုဂျီ ရှာပါ
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-md mx-auto animate-slide-up" style={{ animationDelay: "0.2s" }}>
            မြန်မာလို ရိုက်ထည့်ပြီး သင့်ခံစားချက်နဲ့ လိုက်ဖက်တဲ့ အီမိုဂျီ တွေကို အလွယ်တကူ ရှာဖွေလိုက်ပါ
          </p>
        </div>
      </header>

      {/* Main Search Section */}
      <section className="flex-1 px-4 pb-8 md:pb-16 relative z-10">
        <div className="max-w-xl mx-auto">
          <EmojiSearch />
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 px-4 border-t border-border/50 bg-card/30 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-sm text-muted-foreground">
            အီမိုဂျီပေါင်း ထောင်ချီကို မြန်မာလို ရိုက်ရှာပြီး အလွယ်တကူ ကူးယူနိုင်ပါပြီ
          </p>
        </div>
      </footer>
    </main>
  )
}
